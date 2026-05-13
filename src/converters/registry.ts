import type { Converter, FormatId } from './types';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getConverter(id: FormatId): Converter<any> {
  const c = CONVERTERS[id];
  if (!c) throw new Error(`Unknown converter: ${id}`);
  return c;
}
