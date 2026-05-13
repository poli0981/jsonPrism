import Papa from 'papaparse';
import type { Converter } from './types';

interface CsvOptions {
  delimiter: ',' | '\t';
  /** Include header row from object keys. */
  header: boolean;
  /** Newline sequence. */
  newline: '\n' | '\r\n';
  /** How to serialize nested objects/arrays in cells. */
  nestedStrategy: 'json' | 'flatten';
}

function tabularizeForCsv(data: unknown, strategy: 'json' | 'flatten'): Array<Record<string, unknown>> {
  if (!Array.isArray(data)) {
    throw new Error('CSV/TSV requires the root value to be an array of objects.');
  }
  return data.map((row, i) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`Row ${i} is not an object — CSV requires objects.`);
    }
    const obj = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== null && typeof v === 'object') {
        out[k] = strategy === 'json' ? JSON.stringify(v) : flatten(v, k, out);
      } else {
        out[k] = v;
      }
    }
    return out;
  });
}

function flatten(value: unknown, prefix: string, out: Record<string, unknown>): unknown {
  if (value === null || typeof value !== 'object') {
    out[prefix] = value;
    return value;
  }
  if (Array.isArray(value)) {
    out[prefix] = JSON.stringify(value); // arrays still get stringified for now
    return value;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    flatten(v, `${prefix}.${k}`, out);
  }
  return '';
}

function makeCsv(delimiter: ',' | '\t'): Converter<CsvOptions> {
  return {
    meta: {
      id: delimiter === ',' ? 'csv' : 'tsv',
      labelKey: delimiter === ',' ? 'formats.csv' : 'formats.tsv',
      extension: delimiter === ',' ? 'csv' : 'tsv',
      mimeType: delimiter === ',' ? 'text/csv' : 'text/tab-separated-values',
      phase: 1,
      ready: true,
    },
    defaultOptions: {
      delimiter,
      header: true,
      newline: '\n',
      nestedStrategy: 'json',
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
    ],
    convert({ data }, opts) {
      try {
        const rows = tabularizeForCsv(data, opts.nestedStrategy);
        const output = Papa.unparse(rows, {
          delimiter: opts.delimiter,
          header: opts.header,
          newline: opts.newline,
          quotes: false,
        });
        return { ok: true, output };
      } catch (err) {
        return { ok: false, error: (err as Error).message };
      }
    },
  };
}

export const csvConverter = makeCsv(',');
export const tsvConverter = makeCsv('\t');
