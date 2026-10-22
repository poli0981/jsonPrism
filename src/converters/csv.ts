import Papa from 'papaparse';
import type { Converter } from './types';
import { errorMessage } from '@/lib/errors';
import { defineOwn } from '@/lib/json';

interface CsvOptions {
  delimiter: ',' | '\t';
  /** Include header row from object keys. */
  header: boolean;
  /** Newline sequence. */
  newline: '\n' | '\r\n';
  /** How to serialize nested objects/arrays in cells. */
  nestedStrategy: 'json' | 'flatten';
  /**
   * Prefix cells starting with = + - @ (and tab/CR) with `'` so spreadsheet
   * apps don't execute them as formulas (CSV injection). Off by default
   * because it alters the data.
   */
  escapeFormulae: boolean;
}

type Row = Record<string, unknown>;

function tabularizeForCsv(data: unknown, strategy: 'json' | 'flatten'): Row[] {
  if (!Array.isArray(data)) {
    throw new Error('CSV/TSV requires the root value to be an array of objects.');
  }
  return data.map((row, i) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Row ${i + 1} is not an object — CSV requires objects.`);
    }
    const out: Row = {};
    for (const [k, v] of Object.entries(row as Row)) {
      if (v !== null && typeof v === 'object') {
        if (strategy === 'json') {
          setCell(out, k, JSON.stringify(v));
        } else {
          flatten(v, k, out);
        }
      } else {
        setCell(out, k, v);
      }
    }
    return out;
  });
}

function setCell(out: Row, key: string, value: unknown): void {
  if (Object.hasOwn(out, key)) {
    // e.g. { "a.b": 1, "a": { "b": 2 } } with the flatten strategy.
    throw new Error(`Column "${key}" appears twice after flattening. Rename one of the keys.`);
  }
  defineOwn(out, key, value);
}

function flatten(value: unknown, prefix: string, out: Row): void {
  if (value === null || typeof value !== 'object') {
    setCell(out, prefix, value);
    return;
  }
  if (Array.isArray(value)) {
    // Arrays stay JSON — their positions don't map to stable column names.
    setCell(out, prefix, JSON.stringify(value));
    return;
  }
  const entries = Object.entries(value as Row);
  if (entries.length === 0) {
    // Keep empty objects visible instead of silently dropping the column.
    setCell(out, prefix, '{}');
    return;
  }
  for (const [k, v] of entries) {
    flatten(v, `${prefix}.${k}`, out);
  }
}

/** Union of keys across all rows, in first-seen order. */
function collectColumns(rows: Row[]): string[] {
  const columns: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

// Only canonical numbers become numbers on the way back: "00123", "1.10",
// "1e3" or "+5" stay strings so nothing is reformatted behind the user's back.
function reviveCell(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && /^-?\d/.test(value)) {
    const n = Number(value);
    if (Number.isFinite(n) && String(n) === value) return n;
  }
  return value;
}

function makeCsv(delimiter: ',' | '\t'): Converter<CsvOptions> {
  const isCsv = delimiter === ',';
  return {
    meta: {
      id: isCsv ? 'csv' : 'tsv',
      labelKey: isCsv ? 'formats.csv' : 'formats.tsv',
      extension: isCsv ? 'csv' : 'tsv',
      ...(isCsv ? {} : { altExtensions: ['tab'] }),
      mimeType: isCsv ? 'text/csv' : 'text/tab-separated-values',
      phase: 1,
      ready: true,
    },
    defaultOptions: {
      delimiter,
      header: true,
      newline: '\n',
      nestedStrategy: 'json',
      escapeFormulae: false,
    },
    optionSchema: [
      {
        type: 'boolean',
        key: 'header',
        labelKey: 'options.csv.header',
        descriptionKey: 'options.csv.header_desc',
      },
      {
        type: 'enum',
        key: 'newline',
        labelKey: 'options.csv.newline',
        choices: [
          { value: '\n', labelKey: 'options.csv.newline_lf' },
          { value: '\r\n', labelKey: 'options.csv.newline_crlf' },
        ],
      },
      {
        type: 'enum',
        key: 'nestedStrategy',
        labelKey: 'options.csv.nested_strategy',
        descriptionKey: 'options.csv.nested_strategy_desc',
        choices: [
          { value: 'json', labelKey: 'options.csv.nested_json' },
          { value: 'flatten', labelKey: 'options.csv.nested_flatten' },
        ],
      },
      {
        type: 'boolean',
        key: 'escapeFormulae',
        labelKey: 'options.csv.escape_formulae',
        descriptionKey: 'options.csv.escape_formulae_desc',
      },
    ],
    convert({ data }, opts) {
      try {
        const rows = tabularizeForCsv(data, opts.nestedStrategy);
        const output = Papa.unparse(rows, {
          delimiter: opts.delimiter,
          header: opts.header,
          newline: opts.newline,
          quotes: false,
          // Papa takes columns from the first row only; later keys would be dropped.
          columns: collectColumns(rows),
          escapeFormulae: opts.escapeFormulae,
        });
        return { ok: true, output };
      } catch (err) {
        return { ok: false, error: errorMessage(err) };
      }
    },
    reverse({ text }, opts) {
      try {
        const parsed = Papa.parse<unknown>(text.replace(/^\uFEFF/, ''), {
          delimiter: opts.delimiter,
          header: opts.header,
          skipEmptyLines: true,
          transform: (value) => reviveCell(value),
        });
        if (parsed.errors.length > 0) {
          const first = parsed.errors[0]!;
          const row = first.row === undefined ? '?' : String(first.row + 1);
          return { ok: false, error: `${first.type}: ${first.message} (row ${row})` };
        }
        // When header=true PapaParse returns objects; otherwise arrays.
        return { ok: true, output: JSON.stringify(parsed.data, null, 2) };
      } catch (err) {
        return { ok: false, error: errorMessage(err) };
      }
    },
  };
}

export const csvConverter = makeCsv(',');
export const tsvConverter = makeCsv('\t');
