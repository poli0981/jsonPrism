import { describe, expect, it } from 'vitest';
import { detectShape, parseJsonInput } from '../detect';

describe('detectShape', () => {
  it('recognizes scalars', () => {
    expect(detectShape(42)).toBe('scalar');
    expect(detectShape('hello')).toBe('scalar');
    expect(detectShape(true)).toBe('scalar');
    expect(detectShape(null)).toBe('scalar');
  });

  it('recognizes a flat string-valued object', () => {
    expect(detectShape({ a: 'x', b: 'y' })).toBe('flat-object');
  });

  it('recognizes a non-flat object', () => {
    expect(detectShape({ a: 1, b: 'y' })).toBe('object');
    expect(detectShape({ a: { nested: true } })).toBe('object');
  });

  it('recognizes a plain array', () => {
    expect(detectShape([1, 2, 3])).toBe('array');
    expect(detectShape([1, { a: 1 }])).toBe('array');
  });

  it('recognizes an array of objects', () => {
    expect(detectShape([{ a: 1 }, { a: 2 }])).toBe('array-of-objects');
  });

  it('does not classify empty array as array-of-objects', () => {
    expect(detectShape([])).toBe('array');
  });
});

describe('parseJsonInput', () => {
  it('parses valid JSON and detects shape', () => {
    const result = parseJsonInput('[{"a":1}]');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([{ a: 1 }]);
    expect(result.shape).toBe('array-of-objects');
  });

  it('returns ok=false with sentinel "empty" for whitespace-only input', () => {
    const result = parseJsonInput('   \n  ');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('empty');
  });

  it('surfaces parse errors with line/column when possible', () => {
    const result = parseJsonInput('{\n  "bad": }\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThan(0);
    // Line should be detected if position is in the error message
    if (result.line !== undefined) {
      expect(result.line).toBeGreaterThanOrEqual(1);
    }
  });

  it('handles plain string values', () => {
    const result = parseJsonInput('"just a string"');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBe('just a string');
    expect(result.shape).toBe('scalar');
  });
});
