import { describe, expect, it } from 'vitest';
import { ALL_FORMATS, CONVERTERS, getConverter } from '../registry';
import type { FormatId } from '../types';

describe('converter registry', () => {
  it('exposes all 9 format IDs', () => {
    expect(ALL_FORMATS).toHaveLength(9);
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

  it('Phase 1 converters are marked ready', () => {
    const phase1 = ['jsonl', 'csv', 'tsv', 'yaml'] as const;
    for (const id of phase1) {
      expect(getConverter(id).meta.ready).toBe(true);
    }
  });

  it('Phase 2/3 converters are marked not ready', () => {
    const notReady = ['xml', 'toml', 'markdown', 'sql', 'resx'] as const;
    for (const id of notReady) {
      expect(getConverter(id).meta.ready).toBe(false);
    }
  });
});
