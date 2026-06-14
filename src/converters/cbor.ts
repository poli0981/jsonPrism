import { encode } from 'cbor-x';
import type { Converter } from './types';
import { encodeBytes, type Encoding } from '@/lib/bytes';

interface CborOptions {
  encoding: Encoding;
}

export const cborConverter: Converter<CborOptions> = {
  meta: {
    id: 'cbor',
    labelKey: 'formats.cbor',
    extension: 'cbor',
    mimeType: 'application/cbor',
    phase: 4,
    ready: true,
    binary: true,
  },
  defaultOptions: { encoding: 'base64' },
  optionSchema: [
    {
      type: 'enum',
      key: 'encoding',
      labelKey: 'options.cbor.encoding',
      descriptionKey: 'options.cbor.encoding_desc',
      choices: [
        { value: 'base64', labelKey: 'options.cbor.encoding_base64' },
        { value: 'hex', labelKey: 'options.cbor.encoding_hex' },
      ],
    },
  ],
  convert({ data }, opts) {
    try {
      const bytes = encode(data);
      return { ok: true, output: encodeBytes(bytes, opts.encoding) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};
