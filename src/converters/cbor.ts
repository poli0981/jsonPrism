// The no-eval build: the default entry calls `new Function` at load, which a
// strict Content-Security-Policy blocks.
import { Encoder } from 'cbor-x/index-no-eval';
import type { Converter } from './types';
import { encodeBytes, type Encoding } from '@/lib/bytes';
import { errorMessage } from '@/lib/errors';

interface CborOptions {
  encoding: Encoding;
}

// `variableMapSize` writes the shortest map-length header (deterministic,
// spec-preferred CBOR) instead of cbor-x's fixed 16-bit placeholder.
// `useRecords: false` matters: a bare `new Encoder()` emits cbor-x's private
// record extension (tag 0xdfff) that other CBOR decoders can't read.
const encoder = new Encoder({ variableMapSize: true, useRecords: false });

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
      const bytes = encoder.encode(data);
      return { ok: true, output: encodeBytes(bytes, opts.encoding) };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
};
