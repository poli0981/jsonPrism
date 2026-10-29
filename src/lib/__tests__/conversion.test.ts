import { describe, expect, it } from 'vitest';
import { encodedByteLength, runConversion } from '../conversion';
import { convertFile, convertLive } from '../convert-client';

describe('runConversion', () => {
  it('reports empty input as empty', () => {
    expect(
      runConversion({ text: '  ', format: 'yaml', direction: 'forward', options: {} }).outcome,
    ).toEqual({
      kind: 'empty',
    });
  });

  it('returns parse errors with a position', () => {
    const { outcome } = runConversion({
      text: '{\n  "a": }',
      format: 'yaml',
      direction: 'forward',
      options: {},
    });
    expect(outcome.kind).toBe('input-error');
    if (outcome.kind !== 'input-error') return;
    expect(outcome.line).toBe(2);
  });

  it('separates converter failures from parse failures', () => {
    const { outcome } = runConversion({
      text: '{"a":1}',
      format: 'jsonl',
      direction: 'forward',
      options: { pretty: false },
    });
    expect(outcome.kind).toBe('output-error');
  });

  it('converts and measures output bytes', () => {
    const { outcome, ms } = runConversion({
      text: '[{"a":"é"}]',
      format: 'jsonl',
      direction: 'forward',
      options: { pretty: false },
    });
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(outcome).toMatchObject({
      kind: 'ok',
      output: '{"a":"é"}\n',
      outputBytes: 11,
      shape: 'array-of-objects',
    });
  });

  it('flags formats without a reverse pass', () => {
    expect(
      runConversion({ text: 'x', format: 'sql', direction: 'reverse', options: {} }).outcome.kind,
    ).toBe('no-reverse');
  });

  it('treats reverse failures as input errors', () => {
    expect(
      runConversion({ text: 'a: : b', format: 'yaml', direction: 'reverse', options: {} }).outcome
        .kind,
    ).toBe('input-error');
  });

  it('passes a reverse error position through when the parser knows it', () => {
    const { outcome } = runConversion({
      text: '// config\n{"a": 1 "b": 2}',
      format: 'jsonc',
      direction: 'reverse',
      options: { indent: '2' },
    });
    expect(outcome).toMatchObject({ kind: 'input-error', line: 2, column: 9 });
  });

  it('flags precision loss on huge integers', () => {
    const { outcome } = runConversion({
      text: '{"id": 12345678901234567890}',
      format: 'yaml',
      direction: 'forward',
      options: { indent: 2, flowLevel: -1, quoteStyle: 'auto' },
    });
    expect(outcome.kind === 'ok' && outcome.precisionLoss).toBe(true);
  });
});

describe('encodedByteLength', () => {
  it('matches the decoded size for base64 and hex', () => {
    expect(encodedByteLength('AAAA', 'base64')).toBe(3);
    expect(encodedByteLength('AAA=', 'base64')).toBe(2);
    expect(encodedByteLength('AA==', 'base64')).toBe(1);
    expect(encodedByteLength('00ff', 'hex')).toBe(2);
  });
});

describe('convert-client without Web Workers (jsdom)', () => {
  it('falls back to converting on the main thread', async () => {
    const { outcome } = await convertLive({
      text: '[1,2]',
      format: 'jsonl',
      direction: 'forward',
      options: { pretty: false },
    });
    expect(outcome).toMatchObject({ kind: 'ok', output: '1\n2\n' });
  });

  it('reads files for batch conversion', async () => {
    const file = new File(['[{"a":1}]'], 'a.json');
    const { outcome } = await convertFile(file, {
      format: 'jsonl',
      direction: 'forward',
      options: { pretty: false },
    });
    expect(outcome.kind).toBe('ok');
  });
});
