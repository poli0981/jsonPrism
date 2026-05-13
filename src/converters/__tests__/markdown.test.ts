import { describe, expect, it } from 'vitest';
import { markdownConverter } from '../markdown';

describe('markdownConverter', () => {
  it('emits header + alignment + data rows', () => {
    const data = [
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ];
    const result = markdownConverter.convert({ data }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.output.trim().split('\n');
    expect(lines[0]).toBe('| id | name |');
    expect(lines[1]).toBe('| :--- | :--- |');
    expect(lines[2]).toBe('| 1 | a |');
    expect(lines[3]).toBe('| 2 | b |');
  });

  it('rejects non-array roots', () => {
    const result = markdownConverter.convert({ data: { a: 1 } }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('rejects rows that are not objects', () => {
    const result = markdownConverter.convert({ data: [1, 2] }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('handles empty arrays gracefully', () => {
    const result = markdownConverter.convert({ data: [] }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toBe('');
  });

  it('uses center alignment when configured', () => {
    const data = [{ a: 1 }];
    const result = markdownConverter.convert(
      { data },
      { ...markdownConverter.defaultOptions, alignment: 'center' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('| :---: |');
  });

  it('uses right alignment when configured', () => {
    const data = [{ a: 1 }];
    const result = markdownConverter.convert(
      { data },
      { ...markdownConverter.defaultOptions, alignment: 'right' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('| ---: |');
  });

  it('escapes pipe characters in cells when enabled', () => {
    const data = [{ note: 'a|b|c' }];
    const result = markdownConverter.convert({ data }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('a\\|b\\|c');
  });

  it('does not escape pipes when disabled', () => {
    const data = [{ note: 'a|b' }];
    const result = markdownConverter.convert(
      { data },
      { ...markdownConverter.defaultOptions, escapePipes: false },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('a|b');
  });

  it('converts newlines to <br>', () => {
    const data = [{ multi: 'line1\nline2' }];
    const result = markdownConverter.convert({ data }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('line1<br>line2');
  });

  it('JSON-stringifies nested values', () => {
    const data = [{ tags: ['x', 'y'] }];
    const result = markdownConverter.convert({ data }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('["x","y"]');
  });

  it('emits empty cells for missing keys across rows', () => {
    const data = [{ a: 1, b: 2 }, { a: 3 }];
    const result = markdownConverter.convert({ data }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lines = result.output.trim().split('\n');
    expect(lines[0]).toBe('| a | b |');
    expect(lines[3]).toBe('| 3 |  |');
  });

  it('preserves key insertion order from the first occurrence', () => {
    const data = [
      { z: 1, a: 2 },
      { a: 3, z: 4 },
    ];
    const result = markdownConverter.convert({ data }, markdownConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.split('\n')[0]).toBe('| z | a |');
  });
});
