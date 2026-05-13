import { describe, expect, it } from 'vitest';
import { isFormatSuggested, suggestedFormats } from '../suggestions';

describe('suggestedFormats', () => {
  it('flat-object surfaces RESX first', () => {
    const list = suggestedFormats('flat-object');
    expect(list[0]).toBe('resx');
    expect(list).toContain('yaml');
  });

  it('array-of-objects covers tabular formats', () => {
    const list = suggestedFormats('array-of-objects');
    expect(list).toEqual(expect.arrayContaining(['jsonl', 'csv', 'tsv', 'markdown', 'sql']));
  });

  it('object covers document formats but not tabular', () => {
    const list = suggestedFormats('object');
    expect(list).toContain('yaml');
    expect(list).toContain('toml');
    expect(list).not.toContain('csv');
    expect(list).not.toContain('sql');
  });

  it('scalar limits to YAML', () => {
    expect(suggestedFormats('scalar')).toEqual(['yaml']);
  });

  it('null/unknown shape returns empty list', () => {
    expect(suggestedFormats(null)).toEqual([]);
    expect(suggestedFormats('unknown')).toEqual([]);
  });
});

describe('isFormatSuggested', () => {
  it('is true for matching shape/format pair', () => {
    expect(isFormatSuggested('resx', 'flat-object')).toBe(true);
    expect(isFormatSuggested('sql', 'array-of-objects')).toBe(true);
  });

  it('is false for mismatched pair', () => {
    expect(isFormatSuggested('sql', 'flat-object')).toBe(false);
    expect(isFormatSuggested('resx', 'array-of-objects')).toBe(false);
  });

  it('is false when shape is null', () => {
    expect(isFormatSuggested('resx', null)).toBe(false);
  });
});
