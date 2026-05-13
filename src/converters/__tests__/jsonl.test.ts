import { describe, expect, it } from 'vitest';
import { jsonlConverter } from '../jsonl';

describe('jsonlConverter', () => {
  it('serializes an array of objects, one record per line', () => {
    const data = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const result = jsonlConverter.convert({ data }, { pretty: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('{"id":1,"name":"a"}\n{"id":2,"name":"b"}\n');
  });

  it('rejects non-array roots', () => {
    const result = jsonlConverter.convert({ data: { a: 1 } }, { pretty: false });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/array/i);
  });

  it('handles empty arrays', () => {
    const result = jsonlConverter.convert({ data: [] }, { pretty: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('\n');
  });

  it('pretty-prints when option is set', () => {
    const data = [{ a: 1 }];
    const result = jsonlConverter.convert({ data }, { pretty: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('\n  ');
  });

  it('preserves nested structures', () => {
    const data = [{ tags: ['a', 'b'], meta: { v: 1 } }];
    const result = jsonlConverter.convert({ data }, { pretty: false });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('{"tags":["a","b"],"meta":{"v":1}}\n');
  });

  it('declares phase 1 and ready', () => {
    expect(jsonlConverter.meta.phase).toBe(1);
    expect(jsonlConverter.meta.ready).toBe(true);
  });
});
