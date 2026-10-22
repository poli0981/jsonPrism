/**
 * Pure byte ⇄ text codecs shared by the binary converters (BSON, CBOR,
 * MessagePack) and the output panel's download path.
 *
 * Kept parser-free and outside `src/converters/` so importing it never pulls a
 * heavy serialization library (e.g. `bson`) into the consumer's bundle graph.
 */

export type Encoding = 'base64' | 'hex';

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
// String.fromCharCode.apply has an argument-count limit; stay well under it.
const CHUNK = 0x8000;

export function encodeBytes(bytes: Uint8Array, encoding: Encoding): string {
  if (encoding === 'hex') {
    const parts = new Array<string>(bytes.length);
    for (let i = 0; i < bytes.length; i++) parts[i] = HEX[bytes[i]!]!;
    return parts.join('');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function decodeBytes(encoded: string, encoding: Encoding): Uint8Array {
  if (encoding === 'hex') {
    const clean = encoded.replace(/\s+/g, '').replace(/^0x/i, '');
    if (clean.length % 2 !== 0) throw new Error('Hex string has odd length');
    if (!/^[0-9a-f]*$/i.test(clean)) throw new Error('Hex string contains non-hex characters');
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
      out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }
  // Accept URL-safe base64 and missing padding as well.
  let clean = encoded.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (clean.length % 4 !== 0) clean += '='.repeat(4 - (clean.length % 4));
  let binary: string;
  try {
    binary = atob(clean);
  } catch {
    throw new Error('Base64 string is malformed');
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * UTF-8 byte length of a string without allocating an encoded copy (the old
 * `new TextEncoder().encode(s).length` doubled memory on large inputs).
 */
export function utf8ByteLength(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        // Surrogate pair → one 4-byte code point.
        bytes += 4;
        i++;
      } else {
        bytes += 3; // lone high surrogate → U+FFFD
      }
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
