import { calculateObjectSize, serialize } from 'bson';
import type { Converter } from './types';
import { encodeBytes, type Encoding } from '@/lib/bytes';
import { errorMessage } from '@/lib/errors';

// Re-exported for existing test imports (`../bson`) and any legacy callers.
export { encodeBytes, decodeBytes } from '@/lib/bytes';

interface BsonOptions {
  encoding: Encoding;
}

/** MongoDB's document size limit (16 MiB). */
const BSON_MAX_DOCUMENT_BYTES = 16 * 1024 * 1024;

export const bsonConverter: Converter<BsonOptions> = {
  meta: {
    id: 'bson',
    labelKey: 'formats.bson',
    extension: 'bson',
    mimeType: 'application/bson',
    phase: 4,
    ready: true,
    binary: true,
  },
  defaultOptions: { encoding: 'base64' },
  optionSchema: [
    {
      type: 'enum',
      key: 'encoding',
      labelKey: 'options.bson.encoding',
      descriptionKey: 'options.bson.encoding_desc',
      choices: [
        { value: 'base64', labelKey: 'options.bson.encoding_base64' },
        { value: 'hex', labelKey: 'options.bson.encoding_hex' },
      ],
    },
  ],
  convert({ data }, opts) {
    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
      return {
        ok: false,
        error: 'BSON requires the root value to be a plain object. Wrap arrays in an object first.',
      };
    }
    try {
      const document = data as Record<string, unknown>;
      // bson serializes into a fixed internal buffer and silently truncates
      // anything that doesn't fit — measure first and refuse instead.
      const size = calculateObjectSize(document);
      if (size > BSON_MAX_DOCUMENT_BYTES) {
        const mib = (size / 1024 / 1024).toFixed(1);
        return {
          ok: false,
          error: `This document would be ${mib} MiB of BSON; the format's limit is 16 MiB. Split it into smaller documents.`,
        };
      }
      const bytes = serialize(document);
      return { ok: true, output: encodeBytes(bytes, opts.encoding) };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
};
