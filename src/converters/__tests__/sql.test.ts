import { describe, expect, it } from 'vitest';
import {
  formatSqlValue,
  inferSqlType,
  quoteIdentifier,
  sqlConverter,
  type SqlDialect,
} from '../sql';

describe('quoteIdentifier', () => {
  it('quotes with double-quotes for standard/postgres/sqlite', () => {
    expect(quoteIdentifier('col', 'standard')).toBe('"col"');
    expect(quoteIdentifier('col', 'postgres')).toBe('"col"');
    expect(quoteIdentifier('col', 'sqlite')).toBe('"col"');
  });

  it('quotes with backticks for mysql', () => {
    expect(quoteIdentifier('col', 'mysql')).toBe('`col`');
  });

  it('quotes with brackets for mssql', () => {
    expect(quoteIdentifier('col', 'mssql')).toBe('[col]');
  });

  it('escapes embedded quotes correctly per dialect', () => {
    expect(quoteIdentifier('a"b', 'postgres')).toBe('"a""b"');
    expect(quoteIdentifier('a`b', 'mysql')).toBe('`a``b`');
    expect(quoteIdentifier('a]b', 'mssql')).toBe('[a]]b]');
  });
});

describe('formatSqlValue', () => {
  it('renders NULL for null/undefined', () => {
    expect(formatSqlValue(null, 'standard')).toBe('NULL');
    expect(formatSqlValue(undefined, 'standard')).toBe('NULL');
  });

  it('renders booleans as TRUE/FALSE for standard/postgres', () => {
    expect(formatSqlValue(true, 'standard')).toBe('TRUE');
    expect(formatSqlValue(false, 'postgres')).toBe('FALSE');
  });

  it('renders booleans as 1/0 for mysql/sqlite/mssql', () => {
    expect(formatSqlValue(true, 'mysql')).toBe('1');
    expect(formatSqlValue(false, 'sqlite')).toBe('0');
    expect(formatSqlValue(true, 'mssql')).toBe('1');
  });

  it('renders integers and floats as-is', () => {
    expect(formatSqlValue(42, 'standard')).toBe('42');
    expect(formatSqlValue(3.14, 'standard')).toBe('3.14');
  });

  it('renders non-finite numbers as NULL', () => {
    expect(formatSqlValue(NaN, 'standard')).toBe('NULL');
    expect(formatSqlValue(Infinity, 'standard')).toBe('NULL');
  });

  it('escapes single quotes in strings', () => {
    expect(formatSqlValue("O'Brien", 'standard')).toBe("'O''Brien'");
  });

  it('JSON-stringifies objects and arrays', () => {
    expect(formatSqlValue({ a: 1 }, 'standard')).toBe(`'{"a":1}'`);
    expect(formatSqlValue([1, 2], 'standard')).toBe(`'[1,2]'`);
  });
});

describe('inferSqlType', () => {
  it('infers BOOLEAN for booleans in postgres', () => {
    expect(inferSqlType(true, 'postgres')).toBe('BOOLEAN');
  });

  it('infers TINYINT(1) for booleans in mysql', () => {
    expect(inferSqlType(true, 'mysql')).toBe('TINYINT(1)');
  });

  it('infers BIT for booleans in mssql', () => {
    expect(inferSqlType(true, 'mssql')).toBe('BIT');
  });

  it('infers INTEGER for integer numbers in all dialects', () => {
    const dialects: SqlDialect[] = ['standard', 'postgres', 'mysql', 'sqlite', 'mssql'];
    for (const d of dialects) {
      expect(inferSqlType(42, d)).toBe('INTEGER');
    }
  });

  it('infers DOUBLE PRECISION for floats in postgres', () => {
    expect(inferSqlType(3.14, 'postgres')).toBe('DOUBLE PRECISION');
  });

  it('infers VARCHAR(255) for strings in mysql/mssql, TEXT elsewhere', () => {
    expect(inferSqlType('s', 'mysql')).toBe('VARCHAR(255)');
    expect(inferSqlType('s', 'mssql')).toBe('VARCHAR(255)');
    expect(inferSqlType('s', 'postgres')).toBe('TEXT');
    expect(inferSqlType('s', 'sqlite')).toBe('TEXT');
  });

  it('infers JSONB for objects in postgres, JSON in mysql, TEXT elsewhere', () => {
    expect(inferSqlType({ a: 1 }, 'postgres')).toBe('JSONB');
    expect(inferSqlType({ a: 1 }, 'mysql')).toBe('JSON');
    expect(inferSqlType({ a: 1 }, 'sqlite')).toBe('TEXT');
  });
});

describe('sqlConverter', () => {
  const sampleData = [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: false },
  ];

  it('emits multi-row INSERT by default', () => {
    const result = sqlConverter.convert({ data: sampleData }, sqlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toMatch(/INSERT INTO "records" \("id", "name", "active"\) VALUES/);
    expect(result.output).toContain("(1, 'Alice', TRUE)");
    expect(result.output).toContain("(2, 'Bob', FALSE)");
  });

  it('emits one INSERT per row when multiRow=false', () => {
    const result = sqlConverter.convert(
      { data: sampleData },
      { ...sqlConverter.defaultOptions, multiRow: false },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const inserts = result.output.split('INSERT INTO').length - 1;
    expect(inserts).toBe(2);
  });

  it('chunks multi-row inserts at chunkSize boundary', () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ id: i }));
    const result = sqlConverter.convert({ data }, { ...sqlConverter.defaultOptions, chunkSize: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 5 rows, chunkSize 2 → 3 INSERT statements
    const inserts = result.output.split('INSERT INTO').length - 1;
    expect(inserts).toBe(3);
  });

  it('uses MySQL backtick quoting when dialect=mysql', () => {
    const result = sqlConverter.convert(
      { data: sampleData },
      { ...sqlConverter.defaultOptions, dialect: 'mysql' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('`records`');
    expect(result.output).toContain('`id`');
  });

  it('uses MSSQL bracket quoting when dialect=mssql', () => {
    const result = sqlConverter.convert(
      { data: sampleData },
      { ...sqlConverter.defaultOptions, dialect: 'mssql' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('[records]');
    expect(result.output).toContain('[id]');
  });

  it('includes CREATE TABLE when includeCreate=true', () => {
    const result = sqlConverter.convert(
      { data: sampleData },
      { ...sqlConverter.defaultOptions, includeCreate: true },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('CREATE TABLE "records"');
    expect(result.output).toContain('"id" INTEGER');
    expect(result.output).toContain('"active" BOOLEAN');
  });

  it('respects custom table name', () => {
    const result = sqlConverter.convert(
      { data: sampleData },
      { ...sqlConverter.defaultOptions, tableName: 'users' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toContain('"users"');
    expect(result.output).not.toContain('"records"');
  });

  it('rejects non-array roots', () => {
    const result = sqlConverter.convert({ data: { a: 1 } }, sqlConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('emits comment for empty array', () => {
    const result = sqlConverter.convert({ data: [] }, sqlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.output).toMatch(/^--/);
  });

  it('handles NULL values for missing keys across rows', () => {
    const data = [{ a: 1, b: 2 }, { a: 3 }];
    const result = sqlConverter.convert({ data }, sqlConverter.defaultOptions);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Second row's missing 'b' should be NULL
    expect(result.output).toContain('(3, NULL)');
  });
});
