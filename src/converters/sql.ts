import type { Converter } from './types';

export type SqlDialect = 'standard' | 'postgres' | 'mysql' | 'sqlite' | 'mssql';

interface SqlOptions {
  tableName: string;
  dialect: SqlDialect;
  /** Multi-row INSERT (one statement per chunk) vs single-row INSERT per record. */
  multiRow: boolean;
  /** Chunk size when multiRow is true. */
  chunkSize: number;
  /** Emit a CREATE TABLE statement inferred from the first row's types. */
  includeCreate: boolean;
}

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
          error: `Row ${i} is not an object — SQL INSERT requires objects.`,
        };
      }
    }

    try {
      // Collect keys preserving insertion order across all rows.
      const keys: string[] = [];
      const seen = new Set<string>();
      for (const row of data) {
        for (const k of Object.keys(row as Record<string, unknown>)) {
          if (!seen.has(k)) {
            seen.add(k);
            keys.push(k);
          }
        }
      }

      const quoteId = (name: string) => quoteIdentifier(name, opts.dialect);
      const tableId = quoteId(opts.tableName);
      const cols = keys.map(quoteId).join(', ');

      const parts: string[] = [];

      if (opts.includeCreate) {
        const first = data[0] as Record<string, unknown>;
        const colDefs = keys.map((k) => `  ${quoteId(k)} ${inferSqlType(first[k], opts.dialect)}`);
        parts.push(`CREATE TABLE ${tableId} (\n${colDefs.join(',\n')}\n);`);
        parts.push('');
      }

      if (opts.multiRow) {
        const chunkSize = Math.max(1, opts.chunkSize | 0);
        for (let chunkStart = 0; chunkStart < data.length; chunkStart += chunkSize) {
          const chunk = data.slice(chunkStart, chunkStart + chunkSize);
          const valueRows = chunk.map((row) => {
            const obj = row as Record<string, unknown>;
            const values = keys.map((k) => formatSqlValue(obj[k], opts.dialect));
            return `  (${values.join(', ')})`;
          });
          parts.push(`INSERT INTO ${tableId} (${cols}) VALUES\n${valueRows.join(',\n')};`);
        }
      } else {
        for (const row of data) {
          const obj = row as Record<string, unknown>;
          const values = keys.map((k) => formatSqlValue(obj[k], opts.dialect));
          parts.push(`INSERT INTO ${tableId} (${cols}) VALUES (${values.join(', ')});`);
        }
      }

      return { ok: true, output: parts.join('\n') + '\n' };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
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
  if (typeof value === 'string') {
    return "'" + escapeSqlString(value) + "'";
  }
  if (typeof value === 'object') {
    return "'" + escapeSqlString(JSON.stringify(value)) + "'";
  }
  return "'" + escapeSqlString(String(value)) + "'";
}

export function inferSqlType(value: unknown, dialect: SqlDialect): string {
  if (value === null || value === undefined) return 'TEXT NULL';
  if (typeof value === 'boolean') {
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
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return 'INTEGER';
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
  }
  if (typeof value === 'object') {
    switch (dialect) {
      case 'postgres':
        return 'JSONB';
      case 'mysql':
        return 'JSON';
      default:
        return 'TEXT';
    }
  }
  // string fallback
  switch (dialect) {
    case 'mysql':
    case 'mssql':
      return 'VARCHAR(255)';
    default:
      return 'TEXT';
  }
}

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}
