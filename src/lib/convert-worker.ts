/**
 * Conversion Web Worker. Runs the same pipeline as the main thread
 * ({@link runConversion}) so large documents and batch files don't block
 * typing or scrolling. Loaded via `new Worker(new URL(...), { type: 'module' })`
 * from `convert-client.ts`.
 */

import { runConversion, type ConversionRequest, type TimedOutcome } from './conversion';
import { errorMessage } from './errors';

export type WorkerRequest =
  | { id: number; type: 'text'; request: ConversionRequest }
  | { id: number; type: 'file'; file: File; request: Omit<ConversionRequest, 'text'> };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'result'; id: number; result: TimedOutcome }
  | { type: 'error'; id: number; error: string };

interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event) => {
  const message = event.data;
  void handle(message).then(
    (result) => scope.postMessage({ type: 'result', id: message.id, result }),
    (err: unknown) =>
      scope.postMessage({ type: 'error', id: message.id, error: errorMessage(err) }),
  );
};

async function handle(message: WorkerRequest): Promise<TimedOutcome> {
  if (message.type === 'text') return runConversion(message.request);
  const text = await message.file.text();
  return runConversion({ ...message.request, text });
}

// Tells the client the module (and the parser chunks it imports) loaded, so a
// later crash is reported as a failure instead of silently retried in-thread.
scope.postMessage({ type: 'ready' });
