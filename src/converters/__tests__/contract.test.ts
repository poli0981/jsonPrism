import { describe, expect, it } from 'vitest';
import { ALL_FORMATS, getConverter, isFormatId, safeConvert, safeReverse } from '../registry';
import type { Converter } from '../types';

// Every converter must honour the errors-as-values contract: whatever the
// input, convert()/reverse() return a result object — they never throw and
// never hand back a non-string output.

const ADVERSARIAL_DATA: unknown[] = [
  null,
  0,
  -0,
  '',
  'plain',
  true,
  [],
  {},
  [null],
  [[1, [2, [3]]]],
  [{}, { a: null }],
  { '': '', ' ': ' ', '\u0000': '\u0001' },
  JSON.parse('{"__proto__":{"polluted":true},"constructor":1}') as unknown,
  { nested: { deep: { deeper: { deepest: [1, 'two', null, false, { x: [] }] } } } },
  [{ a: 1 }, { b: 'x' }, { a: { c: [1, 2] } }],
  { big: 1e308, small: -1e-308, unsafe: 2 ** 60 },
];

const ADVERSARIAL_TEXT = [
  '',
  ' ',
  '\uFEFF',
  '<',
  '{"unterminated": ',
  'a,b\n"unclosed',
  '- - - -',
  '[[[[[[[[[[',
  '\u0000\u0001\u0002',
  'key = = value',
  '<root><data name="x"><value>1</value></data></root>',
  // JSONC-shaped: comments, stray commas, a string cut off mid-escape.
  '/*',
  '//',
  '[,]',
  '{"a": 1,} // ok',
  '"\\',
];

describe('converter contract', () => {
  for (const id of ALL_FORMATS) {
    const converter = getConverter(id) as Converter<unknown>;

    it(`${id}: convert never throws and returns a string`, () => {
      for (const data of ADVERSARIAL_DATA) {
        const result = converter.convert({ data }, converter.defaultOptions);
        expect(typeof result.ok).toBe('boolean');
        if (result.ok) expect(typeof result.output).toBe('string');
        else expect(typeof result.error).toBe('string');
      }
    });

    if (typeof converter.reverse === 'function') {
      it(`${id}: reverse never throws and returns JSON or an error`, () => {
        for (const text of ADVERSARIAL_TEXT) {
          const result = converter.reverse!({ text }, converter.defaultOptions);
          if (result.ok) expect(() => JSON.parse(result.output) as unknown).not.toThrow();
          else expect(result.error.length).toBeGreaterThan(0);
        }
      });
    }
  }

  it('prototype keys never pollute Object.prototype', () => {
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});

describe('registry guards', () => {
  it('isFormatId accepts known ids and rejects prototype keys', () => {
    expect(isFormatId('csv')).toBe(true);
    expect(isFormatId('toString')).toBe(false);
    expect(isFormatId('')).toBe(false);
    expect(isFormatId(42)).toBe(false);
  });

  it('safeConvert and safeReverse turn throws into error values', () => {
    const throwing = {
      ...getConverter('jsonl'),
      convert: () => {
        throw new RangeError('Invalid string length');
      },
      reverse: () => {
        throw 'not an Error';
      },
    } as unknown as Converter<unknown>;
    expect(safeConvert(throwing, { data: [] }, {})).toEqual({
      ok: false,
      error: 'Invalid string length',
    });
    expect(safeReverse(throwing, { text: '' }, {})).toEqual({ ok: false, error: 'not an Error' });
  });

  it('safeReverse reports formats without a reverse pass', () => {
    const result = safeReverse(getConverter('sql') as Converter<unknown>, { text: 'x' }, {});
    expect(result.ok).toBe(false);
  });
});
