import { describe, expect, it } from 'vitest';
import { load } from 'js-yaml';
import { parse as parseToml } from 'smol-toml';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { decode as decodeCbor } from 'cbor-x';
import { csvConverter, tsvConverter } from '../csv';
import { sqlConverter, formatSqlValue, inferColumnSqlType, quoteTableName } from '../sql';
import { resxConverter } from '../resx';
import { xmlConverter } from '../xml';
import { yamlConverter } from '../yaml';
import { tomlConverter } from '../toml';
import { bsonConverter } from '../bson';
import { cborConverter } from '../cbor';
import { jsonlConverter } from '../jsonl';
import { markdownConverter } from '../markdown';
import { decodeBytes } from '@/lib/bytes';

// Regression tests for the v2.0.0 audit. Each block names the defect it pins.

function ok(result: { ok: true; output: string } | { ok: false; error: string }): string {
  if (!result.ok) throw new Error(`expected ok, got error: ${result.error}`);
  return result.output;
}

function err(result: { ok: true; output: string } | { ok: false; error: string }): string {
  if (result.ok) throw new Error(`expected an error, got output: ${result.output.slice(0, 200)}`);
  return result.error;
}

describe('CSV', () => {
  it('keeps columns that only appear in later rows', () => {
    const out = ok(
      csvConverter.convert({ data: [{ a: 1 }, { a: 2, b: 3 }] }, csvConverter.defaultOptions),
    );
    expect(out.split('\n')).toEqual(['a,b', '1,', '2,3']);
  });

  it('does not lose every column when the first row is empty', () => {
    const out = ok(csvConverter.convert({ data: [{}, { a: 1 }] }, csvConverter.defaultOptions));
    expect(out.split('\n')[0]).toBe('a');
  });

  it('escapes spreadsheet formulas only when asked', () => {
    const data = [{ cell: '=HYPERLINK("http://evil")' }];
    const raw = ok(csvConverter.convert({ data }, csvConverter.defaultOptions));
    expect(raw).toContain('=HYPERLINK');
    const safe = ok(
      csvConverter.convert({ data }, { ...csvConverter.defaultOptions, escapeFormulae: true }),
    );
    expect(safe).toContain(`'=HYPERLINK`);
  });

  it('reverse keeps non-canonical numbers and dates as written', () => {
    const text =
      'id,price,when,empty,flag\n00123,1.10,2024-01-01T10:00:00+07:00,,true\n7,2.5,x,,false\n';
    const rows = JSON.parse(
      ok(csvConverter.reverse!({ text }, csvConverter.defaultOptions)),
    ) as unknown[];
    expect(rows).toEqual([
      { id: '00123', price: '1.10', when: '2024-01-01T10:00:00+07:00', empty: '', flag: true },
      { id: 7, price: 2.5, when: 'x', empty: '', flag: false },
    ]);
  });

  it('keeps a "__proto__" column instead of dropping it', () => {
    const data = JSON.parse('[{"__proto__":"p","a":1}]') as unknown;
    const out = ok(csvConverter.convert({ data }, csvConverter.defaultOptions));
    expect(out.split('\n')).toEqual(['__proto__,a', 'p,1']);
  });

  it('reports a flatten collision instead of silently overwriting', () => {
    const data = [{ 'a.b': 1, a: { b: 2 } }];
    const message = err(
      csvConverter.convert({ data }, { ...csvConverter.defaultOptions, nestedStrategy: 'flatten' }),
    );
    expect(message).toMatch(/a\.b/);
  });

  it('keeps empty nested objects visible when flattening', () => {
    const data = [{ id: 1, meta: {} }];
    const out = ok(
      csvConverter.convert({ data }, { ...csvConverter.defaultOptions, nestedStrategy: 'flatten' }),
    );
    expect(out.split('\n')).toEqual(['id,meta', '1,{}']);
  });

  it('TSV accepts the .tab extension on input', () => {
    expect(tsvConverter.meta.altExtensions).toContain('tab');
  });
});

describe('SQL', () => {
  it('escapes backslashes for MySQL so data cannot break out of the literal', () => {
    expect(formatSqlValue('C:\\new', 'mysql')).toBe("'C:\\\\new'");
    expect(formatSqlValue('x\\', 'mysql')).toBe("'x\\\\'");
    const payload = "\\'); DROP TABLE records; -- ";
    // The quote stays inside the literal: \\ is a literal backslash, '' a literal quote.
    expect(formatSqlValue(payload, 'mysql')).toBe("'\\\\''); DROP TABLE records; -- '");
  });

  it('leaves backslashes alone where they are not escapes', () => {
    expect(formatSqlValue('C:\\new', 'postgres')).toBe("'C:\\new'");
  });

  it('uses N-prefixed literals for SQL Server', () => {
    expect(formatSqlValue('Tiếng Việt', 'mssql')).toBe("N'Tiếng Việt'");
  });

  it('infers column types from every row', () => {
    expect(inferColumnSqlType([null, 'x'], 'postgres')).toBe('TEXT');
    expect(inferColumnSqlType([1, 1.5], 'postgres')).toBe('DOUBLE PRECISION');
    expect(inferColumnSqlType([1, 1_700_000_000_000], 'postgres')).toBe('BIGINT');
    expect(inferColumnSqlType([true, null], 'mysql')).toBe('TINYINT(1)');
    expect(inferColumnSqlType([1, 'a'], 'mysql')).toBe('VARCHAR(255)');
    expect(inferColumnSqlType(['a'.repeat(300)], 'mysql')).toBe('TEXT');
    expect(inferColumnSqlType(['a'.repeat(300)], 'mssql')).toBe('NVARCHAR(MAX)');
    expect(inferColumnSqlType([1e20], 'mssql')).toBe('DECIMAL(38, 0)');
  });

  it('caps SQL Server multi-row inserts at 1000 rows', () => {
    const data = Array.from({ length: 1500 }, (_, i) => ({ id: i }));
    const out = ok(
      sqlConverter.convert(
        { data },
        { ...sqlConverter.defaultOptions, dialect: 'mssql', chunkSize: 5000 },
      ),
    );
    expect(out.split('INSERT INTO').length - 1).toBe(2);
  });

  it('quotes schema-qualified table names part by part', () => {
    expect(quoteTableName('dbo.Users', 'mssql')).toBe('[dbo].[Users]');
    expect(quoteTableName('  ', 'postgres')).toBe('"records"');
  });

  it('builds CREATE TABLE from all rows', () => {
    const data = [
      { n: null, v: 1 },
      { n: 'x', v: 2.5 },
    ];
    const out = ok(
      sqlConverter.convert({ data }, { ...sqlConverter.defaultOptions, includeCreate: true }),
    );
    expect(out).toContain('"n" TEXT');
    expect(out).toContain('"v" DOUBLE PRECISION');
  });
});

describe('RESX', () => {
  const roundTrip = (data: Record<string, unknown>) => {
    const xml = ok(resxConverter.convert({ data }, resxConverter.defaultOptions));
    return JSON.parse(
      ok(resxConverter.reverse!({ text: xml }, resxConverter.defaultOptions)),
    ) as unknown;
  };

  it('reverse keeps strings exactly as written', () => {
    const data = { a: '007', b: '1.10', c: '0x1F', d: '1e3', e: '  padded  ', f: 'true' };
    expect(roundTrip(data)).toEqual(data);
  });

  it('round-trips CRLF and newlines in keys', () => {
    const data = { 'multi\nline key': 'line1\r\nline2' };
    expect(roundTrip(data)).toEqual(data);
  });

  it('accepts { value: null }', () => {
    const out = ok(
      resxConverter.convert({ data: { K: { value: null } } }, resxConverter.defaultOptions),
    );
    expect(out).toContain('<value></value>');
  });

  it('replaces characters XML cannot carry', () => {
    const out = ok(
      resxConverter.convert({ data: { K: 'a\u0001b' } }, resxConverter.defaultOptions),
    );
    expect(XMLValidator.validate(out)).toBe(true);
    expect(out).toContain('a\uFFFDb');
  });

  it('rejects input that is not XML or not a RESX document', () => {
    expect(
      err(resxConverter.reverse!({ text: 'not xml at all <' }, resxConverter.defaultOptions)),
    ).toMatch(/XML/);
    expect(
      err(
        resxConverter.reverse!(
          { text: '<other><data name="a"/></other>' },
          resxConverter.defaultOptions,
        ),
      ),
    ).toMatch(/root/);
  });

  it('keeps a "__proto__" entry on the way back', () => {
    const data = JSON.parse('{"__proto__":"p"}') as Record<string, unknown>;
    expect(Object.keys(roundTrip(data) as object)).toEqual(['__proto__']);
  });
});

describe('XML', () => {
  const parse = (xml: string) =>
    new XMLParser({ ignoreAttributes: false }).parse(xml) as Record<string, unknown>;

  it('always produces well-formed XML for awkward keys', () => {
    const data = { 'first name': 'A', '1abc': 1, '': 2, '!x': 3, '?pi': 'kept' };
    const out = ok(xmlConverter.convert({ data }, xmlConverter.defaultOptions));
    expect(XMLValidator.validate(out)).toBe(true);
    expect(out).toContain('<first_name key="first name">A</first_name>');
    expect(out).toContain('kept');
  });

  it('wraps arrays nested in arrays instead of emitting <0> elements', () => {
    const data = {
      coords: [
        [1, 2],
        [3, 4],
      ],
    };
    const out = ok(xmlConverter.convert({ data }, xmlConverter.defaultOptions));
    expect(XMLValidator.validate(out)).toBe(true);
    expect(out).not.toMatch(/<\d/);
  });

  it('writes boolean attributes with a value', () => {
    const out = ok(
      xmlConverter.convert(
        { data: { p: { '@_enabled': true, '#text': 'x' } } },
        xmlConverter.defaultOptions,
      ),
    );
    expect(out).toContain('enabled="true"');
  });

  it('keeps empty arrays as empty elements', () => {
    const out = ok(xmlConverter.convert({ data: { tags: [] } }, xmlConverter.defaultOptions));
    expect(parse(out)).toHaveProperty('root.tags');
  });

  it('replaces control characters', () => {
    const out = ok(xmlConverter.convert({ data: { a: 'x\u0001y' } }, xmlConverter.defaultOptions));
    expect(out).toContain('x\uFFFDy');
  });

  it('rejects an invalid root or item name', () => {
    expect(
      err(xmlConverter.convert({ data: {} }, { ...xmlConverter.defaultOptions, rootName: '1bad' })),
    ).toMatch(/root/);
    expect(
      err(xmlConverter.convert({ data: [] }, { ...xmlConverter.defaultOptions, itemName: 'a b' })),
    ).toMatch(/items/);
  });

  it('clamps an out-of-range indent instead of throwing', () => {
    ok(xmlConverter.convert({ data: { a: 1 } }, { ...xmlConverter.defaultOptions, indent: -1 }));
  });
});

describe('YAML', () => {
  it('honours every quote style', () => {
    const data = { name: 'plain', yes: 'yes' };
    const auto = ok(
      yamlConverter.convert({ data }, { ...yamlConverter.defaultOptions, quoteStyle: 'auto' }),
    );
    expect(auto).toContain('name: plain');
    const single = ok(
      yamlConverter.convert({ data }, { ...yamlConverter.defaultOptions, quoteStyle: 'single' }),
    );
    expect(single).toContain("name: 'plain'");
    const double = ok(
      yamlConverter.convert({ data }, { ...yamlConverter.defaultOptions, quoteStyle: 'double' }),
    );
    expect(double).toContain('name: "plain"');
    for (const out of [auto, single, double]) expect(load(out)).toEqual(data);
  });

  it('reverse reports an empty document instead of returning undefined', () => {
    expect(err(yamlConverter.reverse!({ text: '   \n' }, yamlConverter.defaultOptions))).toMatch(
      /empty/i,
    );
  });

  it('reverse keeps timestamps as strings', () => {
    const out = ok(
      yamlConverter.reverse!(
        { text: 'when: 2024-01-01T10:00:00+07:00\n' },
        yamlConverter.defaultOptions,
      ),
    );
    expect(JSON.parse(out)).toEqual({ when: '2024-01-01T10:00:00+07:00' });
  });

  it('reverse resolves merge keys', () => {
    const text = 'base: &b\n  a: 1\nchild:\n  <<: *b\n  c: 2\n';
    const out = ok(yamlConverter.reverse!({ text }, yamlConverter.defaultOptions));
    expect(JSON.parse(out)).toEqual({ base: { a: 1 }, child: { a: 1, c: 2 } });
  });

  it('refuses an alias bomb instead of freezing', () => {
    const lines = ['a: &a ["x","x","x","x","x","x","x","x","x","x"]'];
    let prev = 'a';
    for (const name of ['b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      lines.push(`${name}: &${name} [${Array.from({ length: 10 }, () => `*${prev}`).join(',')}]`);
      prev = name;
    }
    const started = Date.now();
    expect(
      err(yamlConverter.reverse!({ text: lines.join('\n') }, yamlConverter.defaultOptions)),
    ).toMatch(/too many|aliases/i);
    expect(Date.now() - started).toBeLessThan(5_000);
  });
});

describe('TOML', () => {
  it('omits nulls by default and reports their path in error mode', () => {
    const data = { a: 1, b: null, list: [1, null, 2] };
    const out = ok(tomlConverter.convert({ data }, tomlConverter.defaultOptions));
    expect(parseToml(out)).toEqual({ a: 1, list: [1, 2] });
    const message = err(
      tomlConverter.convert({ data }, { ...tomlConverter.defaultOptions, nullHandling: 'error' }),
    );
    expect(message).toContain(' b ');
  });

  it('writes integers beyond 2^53 as valid TOML', () => {
    const out = ok(tomlConverter.convert({ data: { big: 1e20 } }, tomlConverter.defaultOptions));
    expect(() => parseToml(out)).not.toThrow();
  });

  it('reverse keeps 64-bit integers exact', () => {
    const out = ok(
      tomlConverter.reverse!({ text: 'id = 9223372036854775807\n' }, tomlConverter.defaultOptions),
    );
    expect(out).toContain('9223372036854775807');
  });

  it('sorts keys in ordinal order and keeps "__proto__"', () => {
    const data = JSON.parse('{"b":1,"__proto__":2,"a":3}') as Record<string, unknown>;
    const out = ok(
      tomlConverter.convert({ data }, { ...tomlConverter.defaultOptions, sortKeys: true }),
    );
    expect(out.indexOf('__proto__')).toBeGreaterThanOrEqual(0);
    expect(out.indexOf('a =')).toBeLessThan(out.indexOf('b ='));
  });
});

describe('Binary formats', () => {
  it('BSON refuses documents over 16 MiB instead of truncating', () => {
    const data = { blob: 'x'.repeat(17 * 1024 * 1024) };
    expect(err(bsonConverter.convert({ data }, bsonConverter.defaultOptions))).toMatch(/16 MiB/);
  });

  it('CBOR writes the shortest map header', () => {
    const out = ok(cborConverter.convert({ data: { a: 1 } }, { encoding: 'hex' }));
    expect(out.startsWith('a1')).toBe(true);
    expect(decodeCbor(decodeBytes(out, 'hex'))).toEqual({ a: 1 });
  });
});

describe('JSONL / Markdown', () => {
  it('JSONL reverse reports the real line number after blank lines', () => {
    expect(
      err(jsonlConverter.reverse!({ text: '\n\n{bad' }, jsonlConverter.defaultOptions)),
    ).toMatch(/Line 3/);
  });

  it('JSONL reverse ignores a byte-order mark', () => {
    const out = ok(
      jsonlConverter.reverse!({ text: '\uFEFF{"a":1}\n' }, jsonlConverter.defaultOptions),
    );
    expect(JSON.parse(out)).toEqual([{ a: 1 }]);
  });

  it('JSONL accepts .ndjson input', () => {
    expect(jsonlConverter.meta.altExtensions).toContain('ndjson');
  });

  it('Markdown turns a lone CR into a line break', () => {
    const out = ok(
      markdownConverter.convert({ data: [{ a: 'x\ry' }] }, markdownConverter.defaultOptions),
    );
    expect(out).toContain('x<br>y');
  });

  it('Markdown reports rows without keys instead of emitting a broken table', () => {
    expect(
      err(markdownConverter.convert({ data: [{}] }, markdownConverter.defaultOptions)),
    ).toMatch(/no keys/);
  });
});
