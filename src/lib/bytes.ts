/**
 * Pure byte ⇄ text codecs shared by the binary converters (BSON, CBOR,
 * MessagePack) and the output panel's download path.
 *
 * Kept parser-free and outside `src/converters/` so importing it never pulls a
 * heavy serialization library (e.g. `bson`) into the consumer's bundle graph.
 */

export type Encoding = 'base64' | 'hex';

export function encodeBytes(bytes: Uint8Array, encoding: Encoding): string {
  if (encoding === 'hex') {
    let out = '';
    for (let i = 0; i < bytes.length; i++) {
      out += bytes[i]!.toString(16).padStart(2, '0');
    }
    return out;
  }
  // base64 — encode byte-by-byte without a giant String.fromCharCode call.
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
