import type { Converter } from './types';
import { errorMessage } from '@/lib/errors';

export type SqlDialect = 'standard' | 'postgres' | 'mysql' | 'sqlite' | 'mssql';

interface SqlOptions {
  tableName: string;
  dialect: SqlDialect;
  /** Multi-row INSERT (one statement per chunk) vs single-row INSERT per record. */
  multiRow: boolean;
  /** Chunk size when multiRow is true. */
  chunkSize: number;
  /** Emit a CREATE TABLE statement with column types inferred from all rows. */
  includeCreate: boolean;
}

/** SQL Server rejects more than 1000 row value expressions per INSERT (error 10738). */
const MSSQL_MAX_ROWS_PER_INSERT = 1000;
const INT32_MAX = 2_147_483_647;
/** Exclusive bound for |n| of a signed 64-bit integer, as a double. */
const INT64_LIMIT = 2 ** 63;

export const sqlConverter: Converter<SqlOptions> = {
  meta: {
    id: 'sql',
    labelKey: 'formats.sql',
    extension: 'sql',
    mimeType: 'application/sql',
    phase: 2,
    ready: true,
  },
  defaultOptions: {
    tableName: 'records',
    dialect: 'standard',
    multiRow: true,
    chunkSize: 100,
    includeCreate: false,
  },
  optionSchema: [
    {
      type: 'string',
      key: 'tableName',
      labelKey: 'options.sql.table_name',
      descriptionKey: 'options.sql.table_name_desc',
      placeholder: 'records',
    },
    {
      type: 'enum',
      key: 'dialect',
      labelKey: 'options.sql.dialect',
      choices: [
        { value: 'standard', labelKey: 'options.sql.dialect_standard' },
        { value: 'postgres', labelKey: 'options.sql.dialect_postgres' },
        { value: 'mysql', labelKey: 'options.sql.dialect_mysql' },
        { value: 'sqlite', labelKey: 'options.sql.dialect_sqlite' },
        { value: 'mssql', labelKey: 'options.sql.dialect_mssql' },
      ],
    },
    {
      type: 'boolean',
      key: 'multiRow',
      labelKey: 'options.sql.multi_row',
      descriptionKey: 'options.sql.multi_row_desc',
    },
    {
      type: 'integer',
      key: 'chunkSize',
      labelKey: 'options.sql.chunk_size',
      descriptionKey: 'options.sql.chunk_size_desc',
      min: 1,
      max: 10000,
    },
    {
      type: 'boolean',
      key: 'includeCreate',
      labelKey: 'options.sql.include_create',
      descriptionKey: 'options.sql.include_create_desc',
    },
  ],
  convert({ data }, opts) {
    if (!Array.isArray(data)) {
      return {
        ok: false,
        error: 'SQL INSERT requires the root value to be an array of objects.',
      };
    }
    if (data.length === 0) {
      return { ok: true, output: '-- No data rows.\n' };
    }
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row === null || typeof row !== 'object' || Array.isArray(row)) {
        return {
          ok: false,
          error: `Row ${i + 1} is not an object — SQL INSERT requires objects.`,
        };
      }
    }

    try {
      const rows = data as Record<string, unknown>[];
      // Collect keys preserving insertion order across all rows.
      const keys: string[] = [];
      const seen = new Set<string>();
      for (const row of rows) {
        for (const k of Object.keys(row)) {
          if (!seen.has(k)) {
            seen.add(k);
            keys.push(k);
          }
        }
      }

      const quoteId = (name: string) => quoteIdentifier(name, opts.dialect);
      const tableId = quoteTableName(opts.tableName, opts.dialect);
      const cols = keys.map(quoteId).join(', ');

      const parts: string[] = [];

      if (opts.includeCreate) {
        const colDefs = keys.map(
          (k) =>
            `  ${quoteId(k)} ${inferColumnSqlType(
              rows.map((r) => r[k]),
              opts.dialect,
            )}`,
        );
        parts.push(`CREATE TABLE ${tableId} (\n${colDefs.join(',\n')}\n);`);
        parts.push('');
      }

      if (opts.multiRow) {
        let chunkSize = Math.max(1, Math.trunc(Number(opts.chunkSize)) || 1);
        if (opts.dialect === 'mssql') chunkSize = Math.min(chunkSize, MSSQL_MAX_ROWS_PER_INSERT);
        for (let chunkStart = 0; chunkStart < rows.length; chunkStart += chunkSize) {
          const chunk = rows.slice(chunkStart, chunkStart + chunkSize);
          const valueRows = chunk.map((obj) => {
            const values = keys.map((k) => formatSqlValue(obj[k], opts.dialect));
            return `  (${values.join(', ')})`;
          });
          parts.push(`INSERT INTO ${tableId} (${cols}) VALUES\n${valueRows.join(',\n')};`);
        }
      } else {
        for (const obj of rows) {
          const values = keys.map((k) => formatSqlValue(obj[k], opts.dialect));
          parts.push(`INSERT INTO ${tableId} (${cols}) VALUES (${values.join(', ')});`);
        }
      }

      return { ok: true, output: parts.join('\n') + '\n' };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
};

// ---------------------------------------------------------------------------
// Dialect-aware helpers (exported for testing)
// ---------------------------------------------------------------------------

export function quoteIdentifier(name: string, dialect: SqlDialect): string {
  switch (dialect) {
    case 'mysql':
      return '`' + name.replace(/`/g, '``') + '`';
    case 'mssql':
      return '[' + name.replace(/]/g, ']]') + ']';
    case 'standard':
    case 'postgres':
    case 'sqlite':
    default:
      return '"' + name.replace(/"/g, '""') + '"';
  }
}

/**
 * Quotes a possibly schema-qualified table name: `dbo.Users` → `[dbo].[Users]`.
 * Blank input falls back to the default table name.
 */
export function quoteTableName(name: string, dialect: SqlDialect): string {
  const trimmed = name.trim() || 'records';
  return trimmed
    .split('.')
    .map((part) => quoteIdentifier(part.trim() || 'records', dialect))
    .join('.');
}

export function formatSqlValue(value: unknown, dialect: SqlDialect): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') {
    switch (dialect) {
      case 'standard':
      case 'postgres':
        return value ? 'TRUE' : 'FALSE';
      case 'mysql':
      case 'sqlite':
      case 'mssql':
        return value ? '1' : '0';
    }
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'NULL';
    return String(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return quoteSqlString(text, dialect);
}

/**
 * String literal per dialect. MySQL treats backslash as an escape character by
 * default, so it must be doubled — otherwise a trailing `\` breaks the literal
 * and `\'` lets data escape into SQL. SQL Server needs `N'…'` to keep
 * characters outside the database code page (Vietnamese, CJK, emoji).
 */
function quoteSqlString(s: string, dialect: SqlDialect): string {
  let escaped = s.replace(/'/g, "''");
  if (dialect === 'mysql') {
    escaped = escaped.replace(/\\/g, '\\\\').replace(/\0/g, '\\0');
  }
  return dialect === 'mssql' ? `N'${escaped}'` : `'${escaped}'`;
}

type ColumnKind =
  'empty' | 'boolean' | 'int32' | 'int64' | 'bigdecimal' | 'float' | 'string' | 'json';

function kindOf(value: unknown): ColumnKind {
  if (value === null || value === undefined) return 'empty';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return 'empty';
    if (!Number.isInteger(value)) return 'float';
    const abs = Math.abs(value);
    if (abs <= INT32_MAX) return 'int32';
    if (abs < INT64_LIMIT) return 'int64';
    return 'bigdecimal';
  }
  if (typeof value === 'bigint') {
    const abs = value < 0n ? -value : value;
    return abs <= BigInt(INT32_MAX)
      ? 'int32'
      : abs <= 9_223_372_036_854_775_807n
        ? 'int64'
        : 'bigdecimal';
  }
  if (typeof value === 'object') return 'json';
  return 'string';
}

const NUMERIC_ORDER: ColumnKind[] = ['int32', 'int64', 'bigdecimal', 'float'];

/** Widens two observed kinds to one that can hold both. */
function widen(a: ColumnKind, b: ColumnKind): ColumnKind {
  if (a === b || b === 'empty') return a;
  if (a === 'empty') return b;
  const ai = NUMERIC_ORDER.indexOf(a);
  const bi = NUMERIC_ORDER.indexOf(b);
  if (ai >= 0 && bi >= 0) {
    // Integers mixed with fractions need a float; otherwise take the wider integer.
    if (a === 'float' || b === 'float') return 'float';
    return NUMERIC_ORDER[Math.max(ai, bi)]!;
  }
  // Anything else mixed (e.g. number + string, object + string) falls back to text.
  return 'string';
}

/** Column type inferred from every value in the column, not just the first row. */
export function inferColumnSqlType(values: readonly unknown[], dialect: SqlDialect): string {
  let kind: ColumnKind = 'empty';
  let maxStringLength = 0;
  for (const v of values) {
    kind = widen(kind, kindOf(v));
    if (typeof v === 'string') maxStringLength = Math.max(maxStringLength, v.length);
  }
  return sqlTypeFor(kind, dialect, maxStringLength);
}

/** Type for a single sample value (kept for callers and tests). */
export function inferSqlType(value: unknown, dialect: SqlDialect): string {
  return inferColumnSqlType([value], dialect);
}

function sqlTypeFor(kind: ColumnKind, dialect: SqlDialect, maxStringLength: number): string {
  switch (kind) {
    case 'boolean':
      switch (dialect) {
        case 'standard':
        case 'postgres':
          return 'BOOLEAN';
        case 'mysql':
          return 'TINYINT(1)';
        case 'mssql':
          return 'BIT';
        case 'sqlite':
          return 'INTEGER';
      }
      break;
    case 'int32':
      return 'INTEGER';
    case 'int64':
      return dialect === 'sqlite' ? 'INTEGER' : 'BIGINT';
    case 'bigdecimal':
      switch (dialect) {
        case 'sqlite':
          return 'REAL';
        case 'mysql':
        case 'mssql':
          return 'DECIMAL(38, 0)';
        default:
          return 'NUMERIC';
      }
    case 'float':
      switch (dialect) {
        case 'standard':
        case 'postgres':
          return 'DOUBLE PRECISION';
        case 'mysql':
        case 'sqlite':
          return 'DOUBLE';
        case 'mssql':
          return 'FLOAT';
      }
      break;
    case 'json':
      switch (dialect) {
        case 'postgres':
          return 'JSONB';
        case 'mysql':
          return 'JSON';
        case 'mssql':
          return 'NVARCHAR(MAX)';
        default:
          return 'TEXT';
      }
    case 'string':
    case 'empty':
      break;
  }
  // Strings (and columns that are only null).
  switch (dialect) {
    case 'mysql':
      return maxStringLength <= 255
        ? 'VARCHAR(255)'
        : maxStringLength <= 16_383
          ? 'TEXT'
          : 'LONGTEXT';
    case 'mssql':
      return maxStringLength <= 255 ? 'NVARCHAR(255)' : 'NVARCHAR(MAX)';
    default:
      return 'TEXT';
  }
}
