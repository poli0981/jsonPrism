import { serialize } from 'bson';
import type { Converter } from './types';
import { encodeBytes, type Encoding } from '@/lib/bytes';

// Re-exported for existing test imports (`../bson`) and any legacy callers.
export { encodeBytes, decodeBytes } from '@/lib/bytes';

interface BsonOptions {
  encoding: Encoding;
}

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
      const bytes = serialize(data as Record<string, unknown>);
      return { ok: true, output: encodeBytes(bytes, opts.encoding) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};
