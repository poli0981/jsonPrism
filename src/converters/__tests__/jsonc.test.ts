import { describe, expect, it } from 'vitest';
import type { ConversionResult } from '../types';
import { jsoncConverter, parseJsonc } from '../jsonc';

type Indent = (typeof jsoncConverter.defaultOptions)['indent'];

function reverse(text: string, indent: Indent = '2'): ConversionResult {
  return jsoncConverter.reverse!({ text }, { indent });
}

function ok(result: ConversionResult): string {
  if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`);
  return result.output;
}

function fail(result: ConversionResult) {
  if (result.ok) throw new Error(`expected an error, got output: ${result.output.slice(0, 200)}`);
  return result;
}

describe('jsoncConverter — comments', () => {
  it('removes line and block comments', () => {
    const text = `// leading
{
  "a": 1, // trailing
  /* block */ "b": [true, /* inline */ null]
}
/* end */`;
    expect(JSON.parse(ok(reverse(text)))).toEqual({ a: 1, b: [true, null] });
  });

  it('ends a line comment at CR or LF and keeps the rest', () => {
    expect(JSON.parse(ok(reverse('[1, // one\r\n2, // two\r3]')))).toEqual([1, 2, 3]);
  });

  it('keeps comment-like text inside strings', () => {
    const text = '{"url": "http://example.com/*x*/", "path": "C:\\\\dir\\\\", "q": "a\\"//b"} // c';
    expect(JSON.parse(ok(reverse(text)))).toEqual({
      url: 'http://example.com/*x*/',
      path: 'C:\\dir\\',
      q: 'a"//b',
    });
  });

  it('reports an unterminated block comment where it starts', () => {
    const result = fail(reverse('{\n  "a": 1 /* open\n}'));
    expect(result.error).toMatch(/Unterminated block comment/);
    expect(result).toMatchObject({ line: 2, column: 10 });
  });

  it('rejects input that only has comments', () => {
    expect(fail(reverse('// nothing\n/* here */')).error).toMatch(/No JSON value/);
    expect(fail(reverse('')).error).toMatch(/No JSON value/);
  });

  it('reports an unterminated string, even with comments after it', () => {
    expect(fail(reverse('["abc\n// x\n"]'))).toMatchObject({ line: 1 });
    expect(fail(reverse('["abc // x'))).toMatchObject({ line: 1 });
  });

  it('leaves a lone slash for JSON.parse to reject', () => {
    expect(fail(reverse('[1 / 2]')).error.length).toBeGreaterThan(0);
  });
});

describe('jsoncConverter — trailing commas', () => {
  it('removes trailing commas in objects, arrays and nested containers', () => {
    const text = '{"a": [1, 2,], "b": {"c": 3,},}';
    expect(JSON.parse(ok(reverse(text)))).toEqual({ a: [1, 2], b: { c: 3 } });
  });

  it('removes a trailing comma with comments and line breaks before the bracket', () => {
    const text = '[\n  "x", // last item\n  /* nothing more */\n]';
    expect(JSON.parse(ok(reverse(text)))).toEqual(['x']);
  });

  it.each(['[,]', '{,}', '[1,,2]', '[1,,]', '{"a":,}'])('still rejects %s', (text) => {
    expect(fail(reverse(text)).error.length).toBeGreaterThan(0);
  });
});

describe('jsoncConverter — errors line up with the input', () => {
  it('reports a JSON error at its line and column despite earlier comments', () => {
    const text = '/* a\n   b */\n{\n  "a": 1 // ok\n  "b": 2\n}';
    expect(fail(reverse(text))).toMatchObject({ line: 5, column: 3 });
  });

  it('counts columns in UTF-16 code units, like the editor', () => {
    const text = '/* 🎮 */ [1 2]';
    expect(fail(reverse(text))).toMatchObject({ line: 1, column: 13 });
  });

  it('accepts a byte-order mark', () => {
    expect(ok(reverse('\uFEFF// bom\n[1]'))).toBe('[\n  1\n]');
  });
});

describe('jsoncConverter — output keeps values exactly', () => {
  it('copies number literals verbatim', () => {
    const output = ok(reverse('[12345678901234567890, 1.0, 1e3, -0, 0.1e-7]', 'minify'));
    expect(output).toBe('[12345678901234567890,1.0,1e3,-0,0.1e-7]');
  });

  it('keeps duplicate and __proto__ keys', () => {
    const output = ok(reverse('{"a": 1, "a": 2, "__proto__": {"x": 1}}', 'minify'));
    expect(output).toBe('{"a":1,"a":2,"__proto__":{"x":1}}');
  });

  it('collapses empty containers, comments inside included', () => {
    expect(ok(reverse('{ /* nothing */ "a": [ ], "b": { // none\n } }'))).toBe(
      '{\n  "a": [],\n  "b": {}\n}',
    );
  });

  it('formats scalars at the root', () => {
    expect(ok(reverse('/* answer */ 42'))).toBe('42');
    expect(ok(reverse('"text" // c'))).toBe('"text"');
  });
});

describe('jsoncConverter — layout', () => {
  const text = '{"a": [1, {"b": null}], "c": "d"} // c';

  it.each<[Indent, string]>([
    ['2', '{\n  "a": [\n    1,\n    {\n      "b": null\n    }\n  ],\n  "c": "d"\n}'],
    [
      '4',
      '{\n    "a": [\n        1,\n        {\n            "b": null\n        }\n    ],\n    "c": "d"\n}',
    ],
    ['tab', '{\n\t"a": [\n\t\t1,\n\t\t{\n\t\t\t"b": null\n\t\t}\n\t],\n\t"c": "d"\n}'],
    ['minify', '{"a":[1,{"b":null}],"c":"d"}'],
  ])('indent %s', (indent, expected) => {
    expect(ok(reverse(text, indent))).toBe(expected);
  });

  it('handles deep nesting without recursion', () => {
    const depth = 10_000;
    const text = '['.repeat(depth) + '/* deep */' + ']'.repeat(depth);
    const output = ok(reverse(text, 'minify'));
    expect(output).toBe('['.repeat(depth - 1) + '[]' + ']'.repeat(depth - 1));
  });

  it('refuses pretty output that would be enormous', () => {
    const depth = 50_000;
    const text = '['.repeat(depth) + '1' + ']'.repeat(depth);
    expect(fail(reverse(text)).error).toMatch(/too large/);
  });
});

describe('jsoncConverter — contract', () => {
  it('is input-only and has no forward pass', () => {
    expect(jsoncConverter.meta.inputOnly).toBe(true);
    const result = jsoncConverter.convert({ data: { a: 1 } }, jsoncConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('accepts .jsonc and .json files', () => {
    expect(jsoncConverter.meta.extension).toBe('jsonc');
    expect(jsoncConverter.meta.altExtensions).toEqual(['json']);
  });
});

describe('parseJsonc', () => {
  it('returns JSON text at the same offsets as the input', () => {
    const text = '{"a": 1, /* c */ "b": [2,],} // end';
    const result = parseJsonc(text);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.json).toHaveLength(text.length);
    expect(result.json).toBe(`{"a": 1, ${' '.repeat(7)} "b": [2 ] } ${' '.repeat(6)}`);
    expect(JSON.parse(result.json)).toEqual({ a: 1, b: [2] });
  });

  it('returns plain JSON unchanged', () => {
    const text = '{"a": [1, 2]}';
    expect(parseJsonc(text)).toEqual({ ok: true, json: text });
  });
});
