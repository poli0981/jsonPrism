import { describe, expect, it } from 'vitest';
import { csvConverter, tsvConverter } from '../csv';

describe('csvConverter', () => {
  it('emits a header row and data rows for flat objects', () => {
    const data = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const result = csvConverter.convert({ data }, csvConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.output.split('\n');
    expect(lines[0]).toBe('id,name');
    expect(lines[1]).toBe('1,a');
    expect(lines[2]).toBe('2,b');
  });

  it('rejects non-array roots', () => {
    const result = csvConverter.convert({ data: { a: 1 } }, csvConverter.defaultOptions);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/array/i);
  });

  it('rejects rows that are not objects', () => {
    const result = csvConverter.convert({ data: [1, 2, 3] }, csvConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('JSON-stringifies nested values by default', () => {
    const data = [{ id: 1, tags: ['a', 'b'] }];
    const result = csvConverter.convert({ data }, csvConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('["a","b"]');
  });

  it('honors header=false option', () => {
    const data = [{ id: 1, name: 'a' }];
    const result = csvConverter.convert(
      { data },
      { ...csvConverter.defaultOptions, header: false },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // No header line — first line is data
    expect(result.output.startsWith('1,a')).toBe(true);
  });

  it('declares CSV mime type and extension', () => {
    expect(csvConverter.meta.mimeType).toBe('text/csv');
    expect(csvConverter.meta.extension).toBe('csv');
  });
});

describe('tsvConverter', () => {
  it('separates fields with tabs', () => {
    const data = [{ id: 1, name: 'a' }];
    const result = tsvConverter.convert({ data }, tsvConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('id\tname');
    expect(result.output).toContain('1\ta');
  });

  it('declares TSV mime type and extension', () => {
    expect(tsvConverter.meta.mimeType).toBe('text/tab-separated-values');
    expect(tsvConverter.meta.extension).toBe('tsv');
  });
});
