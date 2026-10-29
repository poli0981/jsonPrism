import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import '@/i18n';
import type { Direction, FormatId } from '@/converters/types';
import { SupersededError, WORKER_THRESHOLD_CHARS } from '@/lib/convert-client';
import type * as ConvertClientModule from '@/lib/convert-client';
import type { ConversionRequest, TimedOutcome } from '@/lib/conversion';
import { useConversionResult, type ConversionView } from '../useConversionResult';

// Only the worker hop is replaced; small inputs still run the real pipeline.
const client = vi.hoisted(() => ({ convertLive: vi.fn() }));
vi.mock('@/lib/convert-client', async (importOriginal) => {
  const actual = await importOriginal<typeof ConvertClientModule>();
  return { ...actual, convertLive: client.convertLive };
});

interface Props {
  input: string;
  format: FormatId;
  direction: Direction;
  options: Record<string, unknown>;
}

const CSV_OPTIONS = { delimiter: ',', header: true, newline: '\n', nestedStrategy: 'json' };

function setup(initial: Partial<Props> = {}) {
  const renders: ConversionView[] = [];
  const hook = renderHook(
    ({ input, format, direction, options }: Props) => {
      const view = useConversionResult(input, format, direction, options);
      renders.push(view);
      return view;
    },
    {
      initialProps: {
        input: '',
        format: 'csv',
        direction: 'forward',
        options: CSV_OPTIONS,
        ...initial,
      },
    },
  );
  return { ...hook, renders };
}

/** A worker request whose settlement the test controls. */
function deferred() {
  let resolve!: (value: TimedOutcome) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<TimedOutcome>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function okOutcome(output: string, ms = 12): TimedOutcome {
  return {
    outcome: {
      kind: 'ok',
      output,
      shape: 'object',
      precisionLoss: false,
      outputBytes: output.length,
    },
    ms,
  };
}

const big = (marker: string) =>
  JSON.stringify({ marker, blob: 'x'.repeat(WORKER_THRESHOLD_CHARS) });

describe('useConversionResult — small inputs (main thread)', () => {
  it('is idle for empty or blank input', () => {
    const { result, rerender } = setup();
    expect(result.current).toEqual({
      output: '',
      inputError: null,
      inputErrorLine: null,
      inputErrorColumn: null,
      outputError: null,
      shape: null,
      ms: null,
      outputBytes: 0,
      precisionLoss: false,
      pending: false,
    });

    rerender({ input: '  \n ', format: 'csv', direction: 'forward', options: CSV_OPTIONS });
    expect(result.current.output).toBe('');
    expect(result.current.inputError).toBeNull();
  });

  it('converts valid JSON and reports shape, bytes and timing', () => {
    const { result } = setup({ input: '[{"id":1,"name":"Tunic"},{"id":2,"name":"Ünïcode"}]' });
    const view = result.current;
    expect(view.output).toBe('id,name\n1,Tunic\n2,Ünïcode');
    expect(view.shape).toBe('array-of-objects');
    expect(view.outputBytes).toBe(new TextEncoder().encode(view.output).length);
    expect(view.ms).toEqual(expect.any(Number));
    expect(view.inputError).toBeNull();
    expect(view.outputError).toBeNull();
    expect(view.precisionLoss).toBe(false);
    expect(view.pending).toBe(false);
  });

  it('flags integers that JSON numbers cannot hold exactly', () => {
    const { result } = setup({
      input: '{"id": 12345678901234567890}',
      format: 'yaml',
      options: {},
    });
    expect(result.current.precisionLoss).toBe(true);
    expect(result.current.output).not.toBe('');
  });

  it('reports a syntax error with its line and column', () => {
    const { result } = setup({ input: '{\n  "a": 1,\n}' });
    expect(result.current.inputError).toMatch(/property name/i);
    expect(result.current.inputErrorLine).toBe(3);
    expect(result.current.inputErrorColumn).toBe(1);
    expect(result.current.output).toBe('');
    expect(result.current.outputError).toBeNull();
  });

  it('reports a converter rejection as an output error, keeping the shape', () => {
    const { result } = setup({ input: '[1, 2]', format: 'toml', options: {} });
    expect(result.current.outputError).toBe(
      'TOML requires the root value to be a plain object (table).',
    );
    expect(result.current.shape).toBe('array');
    expect(result.current.inputError).toBeNull();
  });

  it('explains when the format cannot be converted back to JSON', () => {
    const { result } = setup({
      input: '<root/>',
      format: 'xml',
      direction: 'reverse',
      options: {},
    });
    expect(result.current.outputError).toBe('Reverse parse not supported for this format');
    expect(result.current.ms).toEqual(expect.any(Number));
  });

  it('converts back to JSON in reverse', () => {
    const { result } = setup({ input: 'a,b\n1,x', direction: 'reverse' });
    expect(JSON.parse(result.current.output)).toEqual([{ a: 1, b: 'x' }]);
    expect(result.current.shape).toBeNull();
  });

  it('surfaces reverse parse failures as input errors without a position', () => {
    const { result } = setup({
      input: 'a = [1,',
      format: 'toml',
      direction: 'reverse',
      options: {},
    });
    expect(result.current.inputError).toEqual(expect.any(String));
    expect(result.current.inputErrorLine).toBeNull();
    expect(result.current.inputErrorColumn).toBeNull();
  });

  it('surfaces the position of a JSONC error', () => {
    const { result } = setup({
      input: '[\n  1, /* two */\n  2 3\n]',
      format: 'jsonc',
      direction: 'reverse',
      options: { indent: '2' },
    });
    expect(result.current.inputError).toEqual(expect.any(String));
    expect(result.current.inputErrorLine).toBe(3);
    expect(result.current.inputErrorColumn).toBe(5);
  });

  it('re-converts when the options change', () => {
    const { result, rerender } = setup({
      input: '[{"a":1}]',
      format: 'jsonl',
      options: { pretty: false },
    });
    expect(result.current.output).toBe('{"a":1}\n');
    rerender({
      input: '[{"a":1}]',
      format: 'jsonl',
      direction: 'forward',
      options: { pretty: true },
    });
    expect(result.current.output).toBe('{\n  "a": 1\n}\n');
  });

  it('keeps the previous output on screen, marked pending, while typing', () => {
    const { result, rerender, renders } = setup({ input: '[{"a":1}]', format: 'jsonl' });
    renders.length = 0;
    rerender({ input: '[{"a":2}]', format: 'jsonl', direction: 'forward', options: {} });
    // First pass: the deferred input still holds the old text.
    expect(renders[0]).toMatchObject({ output: '{"a":1}\n', pending: true });
    expect(result.current).toMatchObject({ output: '{"a":2}\n', pending: false });
  });

  it('never sends small inputs to the worker', () => {
    setup({ input: '[{"a":1}]' });
    expect(client.convertLive).not.toHaveBeenCalled();
  });
});

describe('useConversionResult — large inputs (worker)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for a pause in typing before converting off-thread', async () => {
    const first = deferred();
    client.convertLive.mockReturnValueOnce(first.promise);
    const input = big('a');
    const { result } = setup({ input, format: 'yaml', options: { indent: 2 } });

    expect(result.current).toMatchObject({ output: '', pending: true });
    act(() => vi.advanceTimersByTime(199));
    expect(client.convertLive).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(client.convertLive).toHaveBeenCalledTimes(1);
    expect(client.convertLive).toHaveBeenCalledWith<[ConversionRequest]>({
      text: input,
      format: 'yaml',
      direction: 'forward',
      options: { indent: 2 },
    });

    await act(async () => first.resolve(okOutcome('marker: a', 42)));
    expect(result.current).toMatchObject({
      output: 'marker: a',
      shape: 'object',
      ms: 42,
      outputBytes: 9,
      pending: false,
    });
  });

  it('debounces bursts of edits into one worker request', () => {
    client.convertLive.mockReturnValue(new Promise(() => {}));
    const { rerender } = setup({ input: big('1') });
    for (const marker of ['2', '3', '4']) {
      act(() => vi.advanceTimersByTime(100));
      rerender({ input: big(marker), format: 'csv', direction: 'forward', options: CSV_OPTIONS });
    }
    act(() => vi.advanceTimersByTime(200));
    expect(client.convertLive).toHaveBeenCalledTimes(1);
    expect(client.convertLive.mock.calls[0]![0]).toMatchObject({ text: big('4') });
  });

  it('keeps the last result visible (pending) until the next one arrives', async () => {
    const first = deferred();
    const second = deferred();
    client.convertLive.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = setup({ input: big('a') });
    act(() => vi.advanceTimersByTime(200));
    await act(async () => first.resolve(okOutcome('A')));
    expect(result.current).toMatchObject({ output: 'A', pending: false });

    rerender({ input: big('b'), format: 'csv', direction: 'forward', options: CSV_OPTIONS });
    expect(result.current).toMatchObject({ output: 'A', pending: true });

    act(() => vi.advanceTimersByTime(200));
    await act(async () => second.resolve(okOutcome('B')));
    expect(result.current).toMatchObject({ output: 'B', pending: false });
  });

  it('ignores a result that arrives after a newer request was made', async () => {
    const stale = deferred();
    const fresh = deferred();
    client.convertLive.mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
    const { result, rerender } = setup({ input: big('old') });
    act(() => vi.advanceTimersByTime(200));

    rerender({ input: big('new'), format: 'csv', direction: 'forward', options: CSV_OPTIONS });
    act(() => vi.advanceTimersByTime(200));
    await act(async () => stale.resolve(okOutcome('OLD')));
    expect(result.current).toMatchObject({ output: '', pending: true });

    await act(async () => fresh.resolve(okOutcome('NEW')));
    expect(result.current).toMatchObject({ output: 'NEW', pending: false });
  });

  it('shows a worker failure as a conversion error', async () => {
    const run = deferred();
    client.convertLive.mockReturnValueOnce(run.promise);
    const { result } = setup({ input: big('a') });
    act(() => vi.advanceTimersByTime(200));

    await act(async () => run.reject(new Error('The conversion ran out of resources.')));
    expect(result.current).toMatchObject({
      output: '',
      outputError: 'Conversion failed: The conversion ran out of resources.',
      pending: false,
    });
  });

  it('stays pending when its request was superseded', async () => {
    const run = deferred();
    client.convertLive.mockReturnValueOnce(run.promise);
    const { result } = setup({ input: big('a') });
    act(() => vi.advanceTimersByTime(200));

    await act(async () => run.reject(new SupersededError()));
    expect(result.current).toMatchObject({ output: '', outputError: null, pending: true });
  });

  it('maps every worker outcome kind like the main-thread path', async () => {
    const outcomes: Array<[TimedOutcome, Partial<ConversionView>]> = [
      [
        { outcome: { kind: 'empty' }, ms: 1 },
        { output: '', ms: null },
      ],
      [
        { outcome: { kind: 'no-reverse' }, ms: 2 },
        { outputError: 'Reverse parse not supported for this format', ms: 2 },
      ],
      [
        { outcome: { kind: 'input-error', message: 'Bad', line: 4, column: 2 }, ms: 3 },
        { inputError: 'Bad', inputErrorLine: 4, inputErrorColumn: 2, ms: 3 },
      ],
      [
        { outcome: { kind: 'output-error', message: 'Nope', shape: 'array' }, ms: 4 },
        { outputError: 'Nope', shape: 'array', ms: 4 },
      ],
    ];
    for (const [outcome, expected] of outcomes) {
      client.convertLive.mockResolvedValueOnce(outcome);
      const { result, unmount } = setup({ input: big('k') });
      act(() => vi.advanceTimersByTime(200));
      await act(async () => {});
      expect(result.current).toMatchObject({ ...expected, pending: false });
      unmount();
    }
  });

  it('drops a result that arrives after unmount', async () => {
    const run = deferred();
    client.convertLive.mockReturnValueOnce(run.promise);
    const { unmount, renders } = setup({ input: big('a') });
    act(() => vi.advanceTimersByTime(200));
    unmount();
    const count = renders.length;
    await act(async () => run.resolve(okOutcome('late')));
    expect(renders).toHaveLength(count);
  });

  it('cancels the pending timer when the input shrinks below the threshold', () => {
    const { result, rerender } = setup({ input: big('a'), format: 'jsonl', options: {} });
    rerender({ input: '[{"a":1}]', format: 'jsonl', direction: 'forward', options: {} });
    act(() => vi.advanceTimersByTime(1000));
    expect(client.convertLive).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ output: '{"a":1}\n', pending: false });
  });
});
