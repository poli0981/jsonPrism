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
    // PapaParse must quote the cell because the JSON value contains commas;
    // inner quotes are CSV-escaped by doubling.
    const lines = result.output.split('\n');
    expect(lines[0]).toBe('id,tags');
    expect(lines[1]).toBe('1,"[""a"",""b""]"');
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

  it('flattens nested objects into dotted-key columns', () => {
    const data = [{ id: 1, meta: { user: 'alice', role: 'admin' } }];
    const result = csvConverter.convert(
      { data },
      { ...csvConverter.defaultOptions, nestedStrategy: 'flatten' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.output.split('\n');
    expect(lines[0]).toBe('id,meta.user,meta.role');
    expect(lines[1]).toBe('1,alice,admin');
    // Parent key should not appear as its own column.
    expect(lines[0]).not.toContain(',meta,');
    expect(lines[0]?.endsWith(',meta')).toBe(false);
  });

  it('flattens deeply nested objects recursively', () => {
    const data = [{ id: 1, a: { b: { c: 'deep' } } }];
    const result = csvConverter.convert(
      { data },
      { ...csvConverter.defaultOptions, nestedStrategy: 'flatten' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.output.split('\n');
    expect(lines[0]).toBe('id,a.b.c');
    expect(lines[1]).toBe('1,deep');
  });

  it('still JSON-stringifies arrays when flatten is selected', () => {
    const data = [{ id: 1, tags: ['x', 'y'] }];
    const result = csvConverter.convert(
      { data },
      { ...csvConverter.defaultOptions, nestedStrategy: 'flatten' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // PapaParse quotes the JSON cell because it contains commas; the inner
    // quotes are CSV-escaped by doubling.
    const lines = result.output.split('\n');
    expect(lines[0]).toBe('id,tags');
    expect(lines[1]).toBe('1,"[""x"",""y""]"');
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
