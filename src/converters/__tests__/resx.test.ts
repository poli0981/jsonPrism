import { describe, expect, it } from 'vitest';
import { escapeAttr, escapeText, resxConverter } from '../resx';

describe('escapeText', () => {
  it('escapes &, <, > in text content', () => {
    expect(escapeText('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
  });

  it('preserves quotes in text', () => {
    expect(escapeText(`hello "world"`)).toBe(`hello "world"`);
  });

  it('handles empty strings', () => {
    expect(escapeText('')).toBe('');
  });
});

describe('escapeAttr', () => {
  it('escapes &, <, >, and quotes', () => {
    expect(escapeAttr(`a"b`)).toBe('a&quot;b');
    expect(escapeAttr('a<b>c&d')).toBe('a&lt;b&gt;c&amp;d');
  });
});

describe('resxConverter', () => {
  it('emits the XML declaration and root element', () => {
    const result = resxConverter.convert(
      { data: { Hello: 'Hi' } },
      resxConverter.defaultOptions,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output.startsWith('<?xml version="1.0" encoding="utf-8"?>\n<root>')).toBe(true);
    expect(result.output.trimEnd().endsWith('</root>')).toBe(true);
  });

  it('emits the standard schema header by default', () => {
    const result = resxConverter.convert(
      { data: { K: 'V' } },
      resxConverter.defaultOptions,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<xsd:schema id="root"');
    expect(result.output).toContain('<resheader name="resmimetype">');
    expect(result.output).toContain('<value>text/microsoft-resx</value>');
    expect(result.output).toContain('<resheader name="version">');
    expect(result.output).toContain('<value>2.0</value>');
    expect(result.output).toContain('System.Resources.ResXResourceReader');
    expect(result.output).toContain('System.Resources.ResXResourceWriter');
  });

  it('omits schema header when includeSchema=false', () => {
    const result = resxConverter.convert(
      { data: { K: 'V' } },
      { ...resxConverter.defaultOptions, includeSchema: false },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).not.toContain('<xsd:schema');
    expect(result.output).not.toContain('<resheader');
  });

  it('emits each entry as a <data> element with xml:space="preserve"', () => {
    const data = { Greeting: 'Hello', Farewell: 'Goodbye' };
    const result = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<data name="Greeting" xml:space="preserve">');
    expect(result.output).toContain('<value>Hello</value>');
    expect(result.output).toContain('<data name="Farewell" xml:space="preserve">');
    expect(result.output).toContain('<value>Goodbye</value>');
  });

  it('supports the { value, _comment } shape for entries with comments', () => {
    const data = {
      WelcomeMsg: { value: 'Hi there', _comment: 'Shown on home screen' },
    };
    const result = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<value>Hi there</value>');
    expect(result.output).toContain('<comment>Shown on home screen</comment>');
  });

  it('honors a custom commentKey', () => {
    const data = { Key1: { value: 'V', note: 'N' } };
    const result = resxConverter.convert(
      { data },
      { ...resxConverter.defaultOptions, commentKey: 'note' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<comment>N</comment>');
  });

  it('escapes XML special characters in values', () => {
    const data = { Tag: '<script>alert("x")</script> & co.' };
    const result = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain(
      '&lt;script&gt;alert("x")&lt;/script&gt; &amp; co.',
    );
  });

  it('escapes special characters in key names (attribute context)', () => {
    const data = { 'Key&Name': 'value' };
    const result = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<data name="Key&amp;Name"');
  });

  it('coerces numbers and booleans to strings', () => {
    const data = { Count: 42, Enabled: true };
    const result = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<value>42</value>');
    expect(result.output).toContain('<value>true</value>');
  });

  it('treats null/undefined as empty string', () => {
    const data = { Empty: null };
    const result = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('<data name="Empty" xml:space="preserve">');
    expect(result.output).toContain('<value></value>');
  });

  it('rejects array roots with a clear error', () => {
    const result = resxConverter.convert({ data: [1, 2, 3] }, resxConverter.defaultOptions);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/flat object/i);
  });

  it('rejects scalar roots', () => {
    const result = resxConverter.convert({ data: 'hello' }, resxConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('rejects nested-object values (without the { value, _comment } shape)', () => {
    const data = { K: { foo: { bar: 'baz' } } };
    const result = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/nested|flat/i);
  });

  it('sortKeys=true sorts entries alphabetically', () => {
    const data = { Zebra: 'z', Apple: 'a', Mango: 'm' };
    const result = resxConverter.convert(
      { data },
      { ...resxConverter.defaultOptions, sortKeys: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const appleIdx = result.output.indexOf('"Apple"');
    const mangoIdx = result.output.indexOf('"Mango"');
    const zebraIdx = result.output.indexOf('"Zebra"');
    expect(appleIdx).toBeLessThan(mangoIdx);
    expect(mangoIdx).toBeLessThan(zebraIdx);
  });

  it('preserves insertion order when sortKeys=false', () => {
    const data = { Zebra: 'z', Apple: 'a' };
    const result = resxConverter.convert({ data }, resxConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const zebraIdx = result.output.indexOf('"Zebra"');
    const appleIdx = result.output.indexOf('"Apple"');
    expect(zebraIdx).toBeLessThan(appleIdx);
  });

  it('declares phase 3 and ready', () => {
    expect(resxConverter.meta.phase).toBe(3);
    expect(resxConverter.meta.ready).toBe(true);
  });

  it('matches Visual Studio resmimetype + version exactly', () => {
    const result = resxConverter.convert(
      { data: { K: 'V' } },
      resxConverter.defaultOptions,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // These literal strings must round-trip through Visual Studio's editor without churn.
    expect(result.output).toContain('<value>text/microsoft-resx</value>');
    expect(result.output).toContain('<value>2.0</value>');
  });
});
