import { describe, expect, it } from 'vitest';
import { deserialize } from 'bson';
import { bsonConverter, decodeBytes, encodeBytes } from '../bson';

describe('bsonConverter', () => {
  it('round-trips a flat object via base64', () => {
    const data = { id: 1, name: 'alpha', active: true };
    const result = bsonConverter.convert({ data }, { encoding: 'base64' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bytes = decodeBytes(result.output, 'base64');
    expect(deserialize(bytes)).toEqual(data);
  });

  it('round-trips via hex', () => {
    const data = { greeting: 'xin chào' };
    const result = bsonConverter.convert({ data }, { encoding: 'hex' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(/^[0-9a-f]+$/.test(result.output)).toBe(true);
    const bytes = decodeBytes(result.output, 'hex');
    expect(deserialize(bytes)).toEqual(data);
  });

  it('rejects array roots (BSON expects a document)', () => {
    const result = bsonConverter.convert({ data: [1, 2] }, bsonConverter.defaultOptions);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/object/i);
  });

  it('rejects scalar roots', () => {
    const result = bsonConverter.convert({ data: 42 }, bsonConverter.defaultOptions);
    expect(result.ok).toBe(false);
  });

  it('declares the BSON mime type and extension', () => {
    expect(bsonConverter.meta.mimeType).toBe('application/bson');
    expect(bsonConverter.meta.extension).toBe('bson');
    expect(bsonConverter.meta.binary).toBe(true);
  });
});

describe('encode/decode helpers', () => {
  it('round-trips bytes via base64', () => {
    const src = new Uint8Array([0, 1, 127, 128, 255]);
    const encoded = encodeBytes(src, 'base64');
    const back = decodeBytes(encoded, 'base64');
    expect(Array.from(back)).toEqual(Array.from(src));
  });

  it('round-trips bytes via hex', () => {
    const src = new Uint8Array([0x00, 0xab, 0xff]);
    const encoded = encodeBytes(src, 'hex');
    expect(encoded).toBe('00abff');
    const back = decodeBytes(encoded, 'hex');
    expect(Array.from(back)).toEqual(Array.from(src));
  });

  it('throws on odd-length hex', () => {
    expect(() => decodeBytes('abc', 'hex')).toThrow(/odd length/i);
  });
});
