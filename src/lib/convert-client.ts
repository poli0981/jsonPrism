/**
 * Main-thread side of the conversion worker. Two channels:
 *  - `live`: the editor. Only the newest request matters, so a request that
 *    arrives while another is still running terminates that worker and starts
 *    over instead of queueing behind a stale multi-megabyte conversion.
 *  - `batch`: sequential file conversions for the batch queue, cancellable and
 *    with a per-file timeout.
 *
 * Fallback policy: only when a worker cannot be created or fails to *load*
 * (no Worker support, blocked by policy, chunk failed to fetch) does work run
 * in-thread. A worker that loaded and then crashed — typically out of memory on
 * a huge document — is reported as a failure; retrying that on the main thread
 * would freeze or crash the tab.
 */

import { runConversion, type ConversionRequest, type TimedOutcome } from './conversion';
import type { WorkerRequest, WorkerResponse } from './convert-worker';
import { createLogger } from './logger';

const log = createLogger('convert-worker');

/** Inputs at or above this size convert off the main thread. */
export const WORKER_THRESHOLD_CHARS = 256 * 1024;
/** A single batch file taking longer than this is abandoned. */
const BATCH_FILE_TIMEOUT_MS = 120_000;

export class SupersededError extends Error {
  constructor() {
    super('Superseded by a newer conversion.');
    this.name = 'SupersededError';
  }
}

class ConversionWorkerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversionWorkerError';
  }
}

class WorkerLoadError extends Error {}

/** `Omit` that distributes over the request union. */
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

interface Pending {
  resolve(value: TimedOutcome): void;
  reject(reason: unknown): void;
}

let workersUnavailable = false;

class Channel {
  private worker: Worker | null = null;
  private ready = false;
  private readonly pending = new Map<number, Pending>();
  private seq = 0;
  private readonly restartOnSupersede: boolean;

  constructor(restartOnSupersede: boolean) {
    this.restartOnSupersede = restartOnSupersede;
  }

  get busy(): boolean {
    return this.pending.size > 0;
  }

  async run(
    message: WithoutId<WorkerRequest>,
    fallback: () => TimedOutcome | Promise<TimedOutcome>,
    signal?: AbortSignal,
    timeoutMs?: number,
  ): Promise<TimedOutcome> {
    if (this.restartOnSupersede && this.busy) {
      // A stale conversion is still running — kill it rather than wait.
      this.reset(new SupersededError());
    }
    const worker = this.ensureWorker();
    if (!worker) return fallback();

    const id = ++this.seq;
    try {
      return await new Promise<TimedOutcome>((resolve, reject) => {
        const onAbort = () =>
          this.reset(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
        signal?.addEventListener('abort', onAbort, { once: true });
        const timer =
          timeoutMs !== undefined
            ? setTimeout(
                () => this.reset(new ConversionWorkerError('Conversion timed out.')),
                timeoutMs,
              )
            : undefined;
        const settle = () => {
          signal?.removeEventListener('abort', onAbort);
          if (timer !== undefined) clearTimeout(timer);
        };
        this.pending.set(id, {
          resolve: (v) => {
            settle();
            resolve(v);
          },
          reject: (e) => {
            settle();
            reject(e);
          },
        });
        worker.postMessage({ ...message, id } as WorkerRequest);
      });
    } catch (err) {
      if (err instanceof WorkerLoadError) {
        log.warn('Conversion worker failed to load; converting on the main thread.');
        return fallback();
      }
      throw err;
    }
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    if (workersUnavailable || typeof Worker === 'undefined') return null;
    let worker: Worker;
    try {
      worker = new Worker(new URL('./convert-worker.ts', import.meta.url), {
        type: 'module',
        name: 'jsonprism-convert',
      });
    } catch (err) {
      log.warn('Web Worker unavailable, converting on the main thread.', err);
      workersUnavailable = true;
      return null;
    }
    this.ready = false;
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (data.type === 'ready') {
        this.ready = true;
        return;
      }
      const entry = this.pending.get(data.id);
      if (!entry) return;
      this.pending.delete(data.id);
      if (data.type === 'result') entry.resolve(data.result);
      else entry.reject(new ConversionWorkerError(data.error));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      if (!this.ready) {
        // Never got going (blocked, missing chunk): stop trying for this session.
        workersUnavailable = true;
        this.reset(new WorkerLoadError(event.message));
      } else {
        log.error('Conversion worker crashed:', event.message);
        this.reset(
          new ConversionWorkerError('The conversion ran out of resources and was stopped.'),
        );
      }
    };
    this.worker = worker;
    return worker;
  }

  private reset(reason: unknown): void {
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
    const entries = [...this.pending.values()];
    this.pending.clear();
    for (const entry of entries) entry.reject(reason);
  }
}

const liveChannel = new Channel(true);
const batchChannel = new Channel(false);

/** Converts editor text; superseded calls reject with {@link SupersededError}. */
export function convertLive(request: ConversionRequest): Promise<TimedOutcome> {
  return liveChannel.run({ type: 'text', request }, () => runConversion(request));
}

/** Reads and converts one batch file (in the worker when available). */
export function convertFile(
  file: File,
  request: Omit<ConversionRequest, 'text'>,
  signal?: AbortSignal,
): Promise<TimedOutcome> {
  return batchChannel.run(
    { type: 'file', file, request },
    async () => runConversion({ ...request, text: await file.text() }),
    signal,
    BATCH_FILE_TIMEOUT_MS,
  );
}
