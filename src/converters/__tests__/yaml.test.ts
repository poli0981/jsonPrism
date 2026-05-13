import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { yamlConverter } from '../yaml';

describe('yamlConverter', () => {
  it('serializes objects to block-style YAML', () => {
    const data = { name: 'JSONPrism', version: 1 };
    const result = yamlConverter.convert({ data }, yamlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('name: JSONPrism');
    expect(result.output).toContain('version: 1');
  });

  it('round-trips through js-yaml parse', () => {
    const data = { a: 1, b: [1, 2, 3], c: { d: 'x' } };
    const result = yamlConverter.convert({ data }, yamlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parsed = yaml.load(result.output);
    expect(parsed).toEqual(data);
  });

  it('respects indent setting', () => {
    const data = { nested: { deeply: { value: 1 } } };
    const result = yamlConverter.convert({ data }, { ...yamlConverter.defaultOptions, indent: 4 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Indent of 4 spaces should appear before "deeply"
    expect(result.output).toMatch(/\n {4}deeply:/);
  });

  it('handles arrays of scalars', () => {
    const data = ['a', 'b', 'c'];
    const result = yamlConverter.convert({ data }, yamlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('- a');
    expect(result.output).toContain('- b');
    expect(result.output).toContain('- c');
  });

  it('serializes null without crashing', () => {
    const data = { x: null };
    const result = yamlConverter.convert({ data }, yamlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('x: null');
  });
});
