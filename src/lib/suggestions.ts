import type { JsonShape } from './detect';
import type { FormatId } from '@/converters/types';

/**
 * Map a detected JSON shape to the formats most likely to make sense.
 * Used by the format picker to highlight "good fits" and dim others.
 */
export function suggestedFormats(shape: JsonShape | null): FormatId[] {
  switch (shape) {
    case 'flat-object':
      // Flat-object is RESX's native shape — surface it first.
      return ['resx', 'yaml', 'toml', 'xml', 'bson', 'cbor', 'msgpack'];
    case 'array-of-objects':
      return ['jsonl', 'csv', 'tsv', 'markdown', 'sql', 'yaml', 'xml', 'cbor', 'msgpack'];
    case 'object':
      return ['yaml', 'toml', 'xml', 'bson', 'cbor', 'msgpack'];
    case 'array':
      return ['jsonl', 'yaml', 'xml', 'cbor', 'msgpack'];
    case 'scalar':
      return ['yaml'];
    default:
      return [];
  }
}

export function isFormatSuggested(format: FormatId, shape: JsonShape | null): boolean {
  return suggestedFormats(shape).includes(format);
}
