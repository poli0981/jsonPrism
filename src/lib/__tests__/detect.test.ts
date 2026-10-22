import { describe, expect, it } from 'vitest';
import { detectShape, errorPosition, findSyntaxErrorOffset, parseJsonInput } from '../detect';

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

describe('parseJsonInput error positions', () => {
  it('reports the line of the error relative to the original text, blank lines included', () => {
    const result = parseJsonInput('\n\n\n{\n  "a": 1,\n  "b": }\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.line).toBe(6);
  });

  it('accepts a leading byte-order mark', () => {
    const result = parseJsonInput('\uFEFF{"a":1}');
    expect(result.ok).toBe(true);
  });

  it('flags integers that lose precision', () => {
    const lossy = parseJsonInput('{"id": 12345678901234567890}');
    expect(lossy.ok && lossy.precisionLoss).toBe(true);
    const safe = parseJsonInput('{"id": "12345678901234567890", "n": 9007199254740991}');
    expect(safe.ok && safe.precisionLoss).toBe(false);
  });
});

describe('errorPosition', () => {
  it('understands the Firefox message format', () => {
    expect(
      errorPosition('JSON.parse: expected , at line 2 column 5 of the JSON data', '{\n'),
    ).toEqual({
      line: 2,
      column: 5,
    });
  });

  it('ignores "position" text echoed inside the quoted snippet', () => {
    const text = '{"a": x}';
    expect(errorPosition('Unexpected token \'x\', "position 999" is not valid JSON', text)).toEqual(
      { line: 1, column: 7 },
    );
  });

  it('falls back to scanning when the engine gives no position (WebKit)', () => {
    expect(errorPosition("JSON Parse error: Expected '}'", '{\n  "a": 1\n')).toEqual({
      line: 3,
      column: 1,
    });
  });
});

describe('findSyntaxErrorOffset', () => {
  it('returns -1 for valid JSON', () => {
    expect(findSyntaxErrorOffset(' {"a":[1,2,{"b":null}],"c":"\u00e9"} ')).toBe(-1);
  });

  it('points at the offending character', () => {
    expect(findSyntaxErrorOffset('[1, 2,, 3]')).toBe(6);
    expect(findSyntaxErrorOffset('{"a": tru}')).toBe(6);
    expect(findSyntaxErrorOffset('"\u0001"')).toBe(1);
  });
});
