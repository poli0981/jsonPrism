import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
  type MockInstance,
} from 'vitest';
import type { ConversionRequest, TimedOutcome } from '@/lib/conversion';
import type * as ConvertClientModule from '@/lib/convert-client';
import type { WorkerRequest, WorkerResponse } from '@/lib/convert-worker';

type ConvertClient = typeof ConvertClientModule;

/** Stand-in for the browser Worker: records traffic and lets a test reply. */
class FakeWorker {
  static instances: FakeWorker[] = [];
  static constructed = 0;
  static constructError: Error | null = null;

  readonly url: string;
  readonly options: WorkerOptions | undefined;
  readonly posted: WorkerRequest[] = [];
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  terminated = false;

  constructor(url: URL | string, options?: WorkerOptions) {
    FakeWorker.constructed += 1;
    if (FakeWorker.constructError) throw FakeWorker.constructError;
    this.url = String(url);
    this.options = options;
    FakeWorker.instances.push(this);
  }

  postMessage(message: WorkerRequest): void {
    this.posted.push(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** A message from the worker to the page. */
  emit(data: WorkerResponse): void {
    this.onmessage?.({ data } as MessageEvent<WorkerResponse>);
  }

  /** An uncaught error inside the worker (failed load or crash). */
  crash(message: string): Mock {
    const preventDefault = vi.fn();
    this.onerror?.({ message, preventDefault } as unknown as ErrorEvent);
    return preventDefault;
  }
}

function worker(index = 0): FakeWorker {
  const instance = FakeWorker.instances[index];
  if (!instance) throw new Error(`no worker #${index}`);
  return instance;
}

function jsonl(text: string): ConversionRequest {
  return { text, format: 'jsonl', direction: 'forward', options: { pretty: false } };
}

const fileRequest: Omit<ConversionRequest, 'text'> = {
  format: 'jsonl',
  direction: 'forward',
  options: { pretty: false },
  sourceName: 'rows.json',
};

function ok(output: string): TimedOutcome {
  return {
    outcome: { kind: 'ok', output, shape: null, precisionLoss: false, outputBytes: output.length },
    ms: 1,
  };
}

/** Records whether a promise settled, without consuming its rejection. */
function track(promise: Promise<unknown>): { settled: boolean } {
  const state = { settled: false };
  promise.then(
    () => (state.settled = true),
    () => (state.settled = true),
  );
  return state;
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

let client: ConvertClient;
let warnSpy: MockInstance<Console['warn']>;
let errorSpy: MockInstance<Console['error']>;

beforeEach(async () => {
  FakeWorker.instances = [];
  FakeWorker.constructed = 0;
  FakeWorker.constructError = null;
  vi.stubGlobal('Worker', FakeWorker);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  // Fresh module per test: "workers unavailable" is session-wide state.
  vi.resetModules();
  client = await import('@/lib/convert-client');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('convert-client', () => {
  it('moves inputs of 256 KiB and more off the main thread', () => {
    expect(client.WORKER_THRESHOLD_CHARS).toBe(256 * 1024);
  });

  it('converts on the main thread when Web Workers are unsupported', async () => {
    vi.stubGlobal('Worker', undefined);

    const live = await client.convertLive(jsonl('[{"a":1}]'));
    expect(live.outcome).toMatchObject({ kind: 'ok', output: '{"a":1}\n' });

    const file = await client.convertFile(new File(['[1,2]'], 'rows.json'), fileRequest);
    expect(file.outcome).toMatchObject({ kind: 'ok', output: '1\n2\n' });
    expect(FakeWorker.constructed).toBe(0);
  });

  describe('live channel', () => {
    it('posts the request to a module worker and resolves with its result', async () => {
      const request = jsonl('[1]');
      const pending = client.convertLive(request);

      expect(new URL(worker().url).pathname).toMatch(/\/convert-worker\.ts$/);
      expect(worker().options).toEqual({ type: 'module', name: 'jsonprism-convert' });
      expect(worker().posted).toEqual([{ type: 'text', request, id: 1 }]);

      const result = ok('1\n');
      worker().emit({ type: 'ready' });
      worker().emit({ type: 'result', id: 1, result });
      await expect(pending).resolves.toBe(result);
    });

    it('rejects with the error the worker reported', async () => {
      const pending = client.convertLive(jsonl('[1]'));
      worker().emit({ type: 'error', id: 1, error: 'Maximum call stack size exceeded' });

      const err = await pending.catch((e: unknown) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err).toMatchObject({
        name: 'ConversionWorkerError',
        message: 'Maximum call stack size exceeded',
      });
      expect(worker().terminated).toBe(false);
    });

    it('ignores replies to requests it is not waiting for', async () => {
      const pending = client.convertLive(jsonl('[1]'));
      const state = track(pending);

      worker().emit({ type: 'result', id: 99, result: ok('stale') });
      await flushMicrotasks();
      expect(state.settled).toBe(false);

      worker().emit({ type: 'result', id: 1, result: ok('1\n') });
      await expect(pending).resolves.toMatchObject({ outcome: { output: '1\n' } });
    });

    it('restarts the worker when a newer conversion supersedes a running one', async () => {
      const first = client.convertLive(jsonl('[1]'));
      const second = client.convertLive(jsonl('[2]'));

      const err = await first.catch((e: unknown) => e);
      expect(err).toBeInstanceOf(client.SupersededError);
      expect(err).toMatchObject({
        name: 'SupersededError',
        message: 'Superseded by a newer conversion.',
      });

      expect(worker(0).terminated).toBe(true);
      expect(worker(1).posted).toEqual([{ type: 'text', request: jsonl('[2]'), id: 2 }]);
      worker(1).emit({ type: 'result', id: 2, result: ok('2\n') });
      await expect(second).resolves.toMatchObject({ outcome: { output: '2\n' } });
    });

    it('keeps the worker once the previous conversion has settled', async () => {
      const first = client.convertLive(jsonl('[1]'));
      worker().emit({ type: 'result', id: 1, result: ok('1\n') });
      await first;

      const second = client.convertLive(jsonl('[2]'));
      expect(FakeWorker.instances).toHaveLength(1);
      expect(worker().terminated).toBe(false);
      expect(worker().posted.map((m) => m.id)).toEqual([1, 2]);

      worker().emit({ type: 'result', id: 2, result: ok('2\n') });
      await expect(second).resolves.toMatchObject({ outcome: { output: '2\n' } });
    });
  });

  describe('batch channel', () => {
    it('queues files on one worker without superseding and matches replies by id', async () => {
      const a = new File(['[1]'], 'a.json');
      const b = new File(['[2]'], 'b.json');
      const first = client.convertFile(a, fileRequest);
      const second = client.convertFile(b, fileRequest);

      expect(FakeWorker.instances).toHaveLength(1);
      expect(worker().posted).toEqual([
        { type: 'file', file: a, request: fileRequest, id: 1 },
        { type: 'file', file: b, request: fileRequest, id: 2 },
      ]);

      worker().emit({ type: 'result', id: 2, result: ok('2\n') });
      worker().emit({ type: 'result', id: 1, result: ok('1\n') });
      await expect(first).resolves.toMatchObject({ outcome: { output: '1\n' } });
      await expect(second).resolves.toMatchObject({ outcome: { output: '2\n' } });
      expect(worker().terminated).toBe(false);
    });

    it('uses a different worker than the live editor', async () => {
      const live = client.convertLive(jsonl('[1]'));
      const file = client.convertFile(new File(['[2]'], 'b.json'), fileRequest);

      expect(FakeWorker.instances).toHaveLength(2);
      worker(0).emit({ type: 'result', id: 1, result: ok('1\n') });
      worker(1).emit({ type: 'result', id: 1, result: ok('2\n') });
      await expect(live).resolves.toMatchObject({ outcome: { output: '1\n' } });
      await expect(file).resolves.toMatchObject({ outcome: { output: '2\n' } });
    });

    it('stops the worker and rejects with the abort reason when cancelled', async () => {
      const controller = new AbortController();
      const file = new File(['[1]'], 'a.json');
      const pending = client.convertFile(file, fileRequest, controller.signal);

      controller.abort();
      const err = await pending.catch((e: unknown) => e);
      expect(err).toBe(controller.signal.reason);
      expect(err).toMatchObject({ name: 'AbortError' });
      expect(worker(0).terminated).toBe(true);

      // The next file starts a fresh worker.
      const next = client.convertFile(file, fileRequest);
      expect(FakeWorker.instances).toHaveLength(2);
      worker(1).emit({ type: 'result', id: 2, result: ok('1\n') });
      await expect(next).resolves.toMatchObject({ outcome: { output: '1\n' } });
    });

    it('passes a custom abort reason through', async () => {
      const controller = new AbortController();
      const pending = client.convertFile(
        new File(['[1]'], 'a.json'),
        fileRequest,
        controller.signal,
      );

      controller.abort(new Error('user cancelled'));
      await expect(pending).rejects.toThrow('user cancelled');
    });

    it('falls back to an AbortError when the signal carries no reason', async () => {
      const signal = new EventTarget() as AbortSignal;
      const pending = client.convertFile(new File(['[1]'], 'a.json'), fileRequest, signal);

      signal.dispatchEvent(new Event('abort'));
      const err = await pending.catch((e: unknown) => e);
      expect(err).toMatchObject({ name: 'AbortError', message: 'Aborted' });
      expect(worker().terminated).toBe(true);
    });

    it('abandons a file that takes longer than two minutes', async () => {
      vi.useFakeTimers();
      const pending = client.convertFile(new File(['[1]'], 'slow.json'), fileRequest);
      const settled = pending.catch((e: unknown) => e);

      vi.advanceTimersByTime(119_999);
      expect(worker().terminated).toBe(false);

      vi.advanceTimersByTime(1);
      expect(await settled).toMatchObject({
        name: 'ConversionWorkerError',
        message: 'Conversion timed out.',
      });
      expect(worker().terminated).toBe(true);
    });

    it('clears the timeout and the abort listener once a file settles', async () => {
      vi.useFakeTimers();
      const controller = new AbortController();
      const pending = client.convertFile(
        new File(['[1]'], 'a.json'),
        fileRequest,
        controller.signal,
      );
      expect(vi.getTimerCount()).toBe(1);

      worker().emit({ type: 'result', id: 1, result: ok('1\n') });
      await expect(pending).resolves.toMatchObject({ outcome: { output: '1\n' } });
      expect(vi.getTimerCount()).toBe(0);

      controller.abort();
      vi.advanceTimersByTime(200_000);
      expect(worker().terminated).toBe(false);
    });
  });

  describe('fallback policy', () => {
    it('converts in-thread when the worker fails to load, for the rest of the session', async () => {
      const pending = client.convertFile(new File(['[3]'], 'c.json'), fileRequest);
      const preventDefault = worker().crash('Failed to fetch dynamically imported module');

      await expect(pending).resolves.toMatchObject({ outcome: { kind: 'ok', output: '3\n' } });
      expect(preventDefault).toHaveBeenCalled();
      expect(worker().terminated).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        '[jsonprism:convert-worker]',
        'Conversion worker failed to load; converting on the main thread.',
      );

      // Neither channel tries to spawn another worker.
      await expect(client.convertLive(jsonl('[4]'))).resolves.toMatchObject({
        outcome: { output: '4\n' },
      });
      await expect(
        client.convertFile(new File(['[5]'], 'e.json'), fileRequest),
      ).resolves.toMatchObject({ outcome: { output: '5\n' } });
      expect(FakeWorker.constructed).toBe(1);
    });

    it('reports a crash after the worker loaded instead of retrying in-thread', async () => {
      const first = client.convertFile(new File(['[1]'], 'a.json'), fileRequest);
      const second = client.convertFile(new File(['[2]'], 'b.json'), fileRequest);
      worker().emit({ type: 'ready' });
      const preventDefault = worker().crash('Out of memory');

      const message = 'The conversion ran out of resources and was stopped.';
      await expect(first).rejects.toThrow(message);
      await expect(second).rejects.toThrow(message);
      expect(preventDefault).toHaveBeenCalled();
      expect(worker().terminated).toBe(true);
      expect(errorSpy).toHaveBeenCalledWith(
        '[jsonprism:convert-worker]',
        'Conversion worker crashed:',
        'Out of memory',
      );

      // Workers are still allowed: the next file gets a fresh one.
      const next = client.convertFile(new File(['[3]'], 'c.json'), fileRequest);
      expect(FakeWorker.instances).toHaveLength(2);
      worker(1).emit({ type: 'result', id: 3, result: ok('3\n') });
      await expect(next).resolves.toMatchObject({ outcome: { output: '3\n' } });
    });

    it('converts in-thread when the worker cannot be constructed', async () => {
      const blocked = new Error('Access to the script is denied by the document CSP');
      FakeWorker.constructError = blocked;

      await expect(client.convertLive(jsonl('[5]'))).resolves.toMatchObject({
        outcome: { output: '5\n' },
      });
      expect(warnSpy).toHaveBeenCalledWith(
        '[jsonprism:convert-worker]',
        'Web Worker unavailable, converting on the main thread.',
        blocked,
      );

      await expect(
        client.convertFile(new File(['[6]'], 'f.json'), fileRequest),
      ).resolves.toMatchObject({ outcome: { output: '6\n' } });
      expect(FakeWorker.constructed).toBe(1);
    });
  });
});
