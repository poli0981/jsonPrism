import { describe, expect, it } from 'vitest';
import { ALL_FORMATS, CONVERTERS, getConverter } from '../registry';
import type { FormatId } from '../types';

describe('converter registry', () => {
  it('exposes all 12 format IDs', () => {
    expect(ALL_FORMATS).toHaveLength(12);
    expect(new Set(ALL_FORMATS)).toEqual(
      new Set<FormatId>([
        'jsonl',
        'csv',
        'tsv',
        'yaml',
        'xml',
        'toml',
        'resx',
        'markdown',
        'sql',
        'bson',
        'cbor',
        'msgpack',
      ]),
    );
  });

  it('CONVERTERS map matches ALL_FORMATS keys', () => {
    expect(Object.keys(CONVERTERS).sort()).toEqual([...ALL_FORMATS].sort());
  });

  it('getConverter returns a converter for every format', () => {
    for (const id of ALL_FORMATS) {
      const c = getConverter(id);
      expect(c.meta.id).toBe(id);
    }
  });

  it('each converter declares defaultOptions and optionSchema', () => {
    for (const id of ALL_FORMATS) {
      const c = getConverter(id);
      expect(c.defaultOptions).toBeDefined();
      expect(Array.isArray(c.optionSchema)).toBe(true);
    }
  });

  it('all 9 converters are marked ready', () => {
    for (const id of ALL_FORMATS) {
      expect(getConverter(id).meta.ready).toBe(true);
    }
  });

  it('phase metadata covers all expected phases', () => {
    const phases = ALL_FORMATS.map((id) => getConverter(id).meta.phase);
    // P1 jsonl/csv/tsv/yaml, P2 xml/toml/markdown/sql, P3 resx, P4 bson/cbor/msgpack.
    expect(new Set(phases)).toEqual(new Set([1, 2, 3, 4]));
  });
});
