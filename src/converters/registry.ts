import type { ConversionInput, ConversionResult, Converter, FormatId, ReverseInput } from './types';
import { errorMessage } from '@/lib/errors';
import { jsonlConverter } from './jsonl';
import { csvConverter, tsvConverter } from './csv';
import { yamlConverter } from './yaml';
import { xmlConverter } from './xml';
import { tomlConverter } from './toml';
import { resxConverter } from './resx';
import { markdownConverter } from './markdown';
import { sqlConverter } from './sql';
import { bsonConverter } from './bson';
import { cborConverter } from './cbor';
import { msgpackConverter } from './msgpack';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CONVERTERS: Record<FormatId, Converter<any>> = {
  jsonl: jsonlConverter,
  csv: csvConverter,
  tsv: tsvConverter,
  yaml: yamlConverter,
  xml: xmlConverter,
  toml: tomlConverter,
  resx: resxConverter,
  markdown: markdownConverter,
  sql: sqlConverter,
  bson: bsonConverter,
  cbor: cborConverter,
  msgpack: msgpackConverter,
};

export const ALL_FORMATS: FormatId[] = [
  'jsonl',
  'csv',
  'tsv',
  'yaml',
  'xml',
  'toml',
  'resx',
  'markdown',
  'sql',
  'bson',
  'cbor',
  'msgpack',
];

/**
 * Narrows untrusted input (localStorage, URL, IPC) to a known format id.
 * `Object.hasOwn` keeps prototype keys like "toString" out.
 */
export function isFormatId(value: unknown): value is FormatId {
  return typeof value === 'string' && Object.hasOwn(CONVERTERS, value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getConverter(id: FormatId): Converter<any> {
  if (!isFormatId(id)) throw new Error(`Unknown converter: ${String(id)}`);
  return CONVERTERS[id];
}

/** Lowercase extensions accepted for a format's own files (canonical first). */
export function extensionsFor(id: FormatId): string[] {
  const { extension, altExtensions = [] } = getConverter(id).meta;
  return [extension, ...altExtensions];
}

/**
 * Runs a converter's forward pass behind a last-resort guard. Converters return
 * errors as values, but engines can still throw from deep inside a library
 * (e.g. `RangeError: Invalid string length` on huge outputs); that must never
 * escape into React's render.
 */
export function safeConvert<T>(
  converter: Converter<T>,
  input: ConversionInput,
  options: T,
): ConversionResult {
  try {
    return converter.convert(input, options);
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

/** Reverse-pass counterpart of {@link safeConvert}. */
export function safeReverse<T>(
  converter: Converter<T>,
  input: ReverseInput,
  options: T,
): ConversionResult {
  if (typeof converter.reverse !== 'function') {
    return { ok: false, error: `${converter.meta.id} does not support reverse conversion.` };
  }
  try {
    return converter.reverse(input, options);
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
