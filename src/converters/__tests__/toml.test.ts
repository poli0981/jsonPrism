import { describe, expect, it } from 'vitest';
import { parse } from 'smol-toml';
import { tomlConverter } from '../toml';

describe('tomlConverter', () => {
  it('serializes a flat object', () => {
    const data = { name: 'JSONPrism', version: '0.3.0' };
    const result = tomlConverter.convert({ data }, tomlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('name = "JSONPrism"');
    expect(result.output).toContain('version = "0.3.0"');
  });

  it('round-trips through smol-toml parse', () => {
    const data = { name: 'test', count: 42, enabled: true, tags: ['a', 'b'] };
    const result = tomlConverter.convert({ data }, tomlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = parse(result.output);
    expect(parsed).toEqual(data);
  });

  it('rejects non-object roots (array)', () => {
    const result = tomlConverter.convert({ data: [1, 2] }, tomlConverter.defaultOptions);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/plain object|table/i);
  });

  it('rejects non-object roots (scalar)', () => {
    const result = tomlConverter.convert({ data: 'hello' }, tomlConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('rejects null root', () => {
    const result = tomlConverter.convert({ data: null }, tomlConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('emits nested tables for nested objects', () => {
    const data = { db: { host: 'localhost', port: 5432 } };
    const result = tomlConverter.convert({ data }, tomlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toMatch(/\[db\]|db\.host/);
  });

  it('sorts keys when sortKeys=true', () => {
    const data = { zebra: 1, apple: 2, mango: 3 };
    const result = tomlConverter.convert(
      { data },
      { ...tomlConverter.defaultOptions, sortKeys: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const appleIdx = result.output.indexOf('apple');
    const mangoIdx = result.output.indexOf('mango');
    const zebraIdx = result.output.indexOf('zebra');
    expect(appleIdx).toBeLessThan(mangoIdx);
    expect(mangoIdx).toBeLessThan(zebraIdx);
  });
});
