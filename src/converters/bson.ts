import { serialize } from 'bson';
import type { Converter } from './types';

type Encoding = 'base64' | 'hex';

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

export function encodeBytes(bytes: Uint8Array, encoding: Encoding): string {
  if (encoding === 'hex') {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += bytes[i]!.toString(16).padStart(2, '0');
    }
    return out;
  }
  // base64 — encode 3 bytes at a time without using a giant String.fromCharCode call.
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

export function decodeBytes(encoded: string, encoding: Encoding): Uint8Array {
  if (encoding === 'hex') {
    const clean = encoded.replace(/\s+/g, '');
    if (clean.length % 2 !== 0) throw new Error('Hex string has odd length');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }
  const binary = atob(encoded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
