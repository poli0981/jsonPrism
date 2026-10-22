import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { ConversionRequest } from '@/lib/conversion';
import type { WorkerRequest, WorkerResponse } from '@/lib/convert-worker';

interface FakeScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage: Mock<(message: WorkerResponse) => void>;
}

let scope: FakeScope;

/** Loads a fresh copy of the worker module against a fake `self`. */
beforeEach(async () => {
  scope = { onmessage: null, postMessage: vi.fn() };
  vi.stubGlobal('self', scope);
  vi.resetModules();
  await import('@/lib/convert-worker');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function send(message: WorkerRequest): void {
  if (!scope.onmessage) throw new Error('worker did not install onmessage');
  scope.onmessage({ data: message } as MessageEvent<WorkerRequest>);
}

/** Waits for the reply to `id` (replies arrive asynchronously). */
async function replyFor(id: number): Promise<WorkerResponse> {
  let reply: WorkerResponse | undefined;
  await vi.waitFor(() => {
    reply = scope.postMessage.mock.calls
      .map(([message]) => message)
      .find((message) => message.type !== 'ready' && message.id === id);
    expect(reply).toBeDefined();
  });
  return reply!;
}

const jsonlRequest: ConversionRequest = {
  text: '[{"a":1},{"b":2}]',
  format: 'jsonl',
  direction: 'forward',
  options: { pretty: false },
};

describe('convert-worker', () => {
  it('announces that it loaded and listens for requests', () => {
    expect(scope.postMessage).toHaveBeenCalledTimes(1);
    expect(scope.postMessage).toHaveBeenCalledWith({ type: 'ready' });
    expect(typeof scope.onmessage).toBe('function');
  });

  it('converts editor text and replies with the request id', async () => {
    send({ id: 7, type: 'text', request: jsonlRequest });

    expect(await replyFor(7)).toEqual({
      type: 'result',
      id: 7,
      result: {
        outcome: expect.objectContaining({ kind: 'ok', output: '{"a":1}\n{"b":2}\n' }),
        ms: expect.any(Number),
      },
    });
  });

  it('reads batch files before converting them', async () => {
    const file = new File(['name: Ada\nlangs:\n  - en\n'], 'people.yaml');
    send({
      id: 3,
      type: 'file',
      file,
      request: { format: 'yaml', direction: 'reverse', options: {}, sourceName: 'people.yaml' },
    });

    const reply = await replyFor(3);
    expect(reply.type).toBe('result');
    if (reply.type !== 'result' || reply.result.outcome.kind !== 'ok') {
      throw new Error(`unexpected reply ${JSON.stringify(reply)}`);
    }
    expect(JSON.parse(reply.result.outcome.output)).toEqual({ name: 'Ada', langs: ['en'] });
  });

  it('reports invalid input as an outcome rather than a worker error', async () => {
    send({ id: 4, type: 'text', request: { ...jsonlRequest, text: '{"a":' } });

    const reply = await replyFor(4);
    expect(reply).toMatchObject({
      type: 'result',
      id: 4,
      result: { outcome: { kind: 'input-error' } },
    });
  });

  it('replies with an error message when a file cannot be read', async () => {
    const unreadable = {
      text: () => Promise.reject(new Error('The file could not be read')),
    } as unknown as File;
    send({
      id: 5,
      type: 'file',
      file: unreadable,
      request: { format: 'jsonl', direction: 'forward', options: { pretty: false } },
    });

    expect(await replyFor(5)).toEqual({
      type: 'error',
      id: 5,
      error: 'The file could not be read',
    });
  });

  it('answers concurrent requests independently', async () => {
    send({ id: 10, type: 'text', request: { ...jsonlRequest, text: '[1]' } });
    send({ id: 11, type: 'text', request: { ...jsonlRequest, text: '[2]' } });

    const [first, second] = await Promise.all([replyFor(10), replyFor(11)]);
    expect(first).toMatchObject({ result: { outcome: { kind: 'ok', output: '1\n' } } });
    expect(second).toMatchObject({ result: { outcome: { kind: 'ok', output: '2\n' } } });
  });
});
