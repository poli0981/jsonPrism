import { encode } from '@msgpack/msgpack';
import type { Converter } from './types';
import { encodeBytes, type Encoding } from '@/lib/bytes';

interface MsgpackOptions {
  encoding: Encoding;
}

export const msgpackConverter: Converter<MsgpackOptions> = {
  meta: {
    id: 'msgpack',
    labelKey: 'formats.msgpack',
    extension: 'msgpack',
    mimeType: 'application/x-msgpack',
    phase: 4,
    ready: true,
    binary: true,
  },
  defaultOptions: { encoding: 'base64' },
  optionSchema: [
    {
      type: 'enum',
      key: 'encoding',
      labelKey: 'options.msgpack.encoding',
      descriptionKey: 'options.msgpack.encoding_desc',
      choices: [
        { value: 'base64', labelKey: 'options.msgpack.encoding_base64' },
        { value: 'hex', labelKey: 'options.msgpack.encoding_hex' },
      ],
    },
  ],
  convert({ data }, opts) {
    try {
      const bytes = encode(data);
      // @msgpack/msgpack returns Uint8Array; normalize the buffer view for callers.
      const view = new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return { ok: true, output: encodeBytes(view, opts.encoding) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};
