import { describe, expect, it } from 'vitest';
import { extOf, filterByExtension, getAllowedExtensions } from '../file-filter';

function f(name: string): File {
  return new File(['x'], name);
}

describe('getAllowedExtensions', () => {
  it('returns json + txt for forward direction regardless of format', () => {
    expect(getAllowedExtensions('forward', 'yaml')).toEqual(['json', 'txt']);
    expect(getAllowedExtensions('forward', 'resx')).toEqual(['json', 'txt']);
  });

  it('returns format extension + txt for reverse direction, lowercased', () => {
    expect(getAllowedExtensions('reverse', 'yaml')).toEqual(['yaml', 'txt']);
    expect(getAllowedExtensions('reverse', 'RESX')).toEqual(['resx', 'txt']);
    expect(getAllowedExtensions('reverse', 'toml')).toEqual(['toml', 'txt']);
  });
});

describe('extOf', () => {
  it('lowercases the trailing extension', () => {
    expect(extOf('foo.JSON')).toBe('json');
    expect(extOf('a.b.cs')).toBe('cs');
  });

  it('returns empty string for names with no extension', () => {
    expect(extOf('noext')).toBe('');
    expect(extOf('trailing.')).toBe('');
    expect(extOf('.hidden')).toBe('hidden');
  });
});

describe('filterByExtension', () => {
  it('partitions by extension whitelist (case-insensitive)', () => {
    const cs = f('a.cs');
    const json = f('b.json');
    const yaml = f('c.yaml');
    const result = filterByExtension([cs, json, yaml], ['json', 'txt']);
    expect(result.valid).toEqual([json]);
    expect(result.wrongFormat).toBe(2);
  });

  it('accepts uppercase extensions because whitelist comparison is lowercased', () => {
    const upper = f('FOO.JSON');
    const result = filterByExtension([upper], ['json', 'txt']);
    expect(result.valid).toEqual([upper]);
    expect(result.wrongFormat).toBe(0);
  });

  it('returns empty result for empty input', () => {
    expect(filterByExtension([], ['json'])).toEqual({ valid: [], wrongFormat: 0 });
  });

  it('rejects extensionless names by default', () => {
    const opaque = f('1000000123');
    const result = filterByExtension([opaque], ['json', 'txt']);
    expect(result.valid).toEqual([]);
    expect(result.wrongFormat).toBe(1);
  });

  it('accepts extensionless names when lenient (Android content URIs)', () => {
    const opaque = f('1000000123');
    const json = f('b.json');
    const png = f('c.png');
    const result = filterByExtension([opaque, json, png], ['json', 'txt'], true);
    // opaque (no ext) + json pass; png has a recognizable, disallowed ext.
    expect(result.valid).toEqual([opaque, json]);
    expect(result.wrongFormat).toBe(1);
  });
});
