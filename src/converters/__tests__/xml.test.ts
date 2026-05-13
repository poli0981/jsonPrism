import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import { xmlConverter } from '../xml';

describe('xmlConverter', () => {
  it('wraps an object under the root element', () => {
    const data = { name: 'JSONPrism', version: 1 };
    const result = xmlConverter.convert({ data }, xmlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<root>');
    expect(result.output).toContain('<name>JSONPrism</name>');
    expect(result.output).toContain('<version>1</version>');
    expect(result.output).toContain('</root>');
  });

  it('wraps an array using itemName', () => {
    const data = [1, 2, 3];
    const result = xmlConverter.convert({ data }, xmlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<item>1</item>');
    expect(result.output).toContain('<item>2</item>');
    expect(result.output).toContain('<item>3</item>');
  });

  it('emits the XML declaration when enabled', () => {
    const data = { a: 1 };
    const result = xmlConverter.convert({ data }, { ...xmlConverter.defaultOptions, declaration: true });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('omits the declaration when disabled', () => {
    const data = { a: 1 };
    const result = xmlConverter.convert(
      { data },
      { ...xmlConverter.defaultOptions, declaration: false },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.startsWith('<?xml')).toBe(false);
  });

  it('respects custom rootName and itemName', () => {
    const data = [{ id: 1 }];
    const result = xmlConverter.convert(
      { data },
      { ...xmlConverter.defaultOptions, rootName: 'games', itemName: 'game' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<games>');
    expect(result.output).toContain('<game>');
    expect(result.output).toContain('<id>1</id>');
  });

  it('round-trips simple objects through fast-xml-parser', () => {
    const data = { name: 'Alice', age: 30 };
    const result = xmlConverter.convert({ data }, xmlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const parser = new XMLParser();
    const parsed = parser.parse(result.output) as { root: { name: string; age: number } };
    expect(parsed.root.name).toBe('Alice');
    expect(parsed.root.age).toBe(30);
  });

  it('supports attributes via @_ prefix', () => {
    const data = { person: { '@_id': '1', name: 'Alice' } };
    const result = xmlConverter.convert({ data }, xmlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('id="1"');
    expect(result.output).toContain('<name>Alice</name>');
  });

  it('respects indent=0 for compact output', () => {
    const data = { a: 1, b: 2 };
    const result = xmlConverter.convert(
      { data },
      { ...xmlConverter.defaultOptions, indent: 0, declaration: false },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain('\n  '); // no indentation
  });
});
