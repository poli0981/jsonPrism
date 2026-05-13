import { describe, expect, it } from 'vitest';
import { decode } from 'cbor-x';
import { cborConverter } from '../cbor';
import { decodeBytes } from '../bson';

describe('cborConverter', () => {
  it('round-trips a primitive', () => {
    const result = cborConverter.convert({ data: 42 }, { encoding: 'base64' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(decode(decodeBytes(result.output, 'base64'))).toBe(42);
  });

  it('round-trips an object', () => {
    const data = { id: 1, tags: ['a', 'b'], nested: { x: true } };
    const result = cborConverter.convert({ data }, { encoding: 'base64' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(decode(decodeBytes(result.output, 'base64'))).toEqual(data);
  });

  it('round-trips an array', () => {
    const data = [1, 2, 3];
    const result = cborConverter.convert({ data }, { encoding: 'hex' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(decode(decodeBytes(result.output, 'hex'))).toEqual(data);
  });

  it('declares CBOR mime type and extension', () => {
    expect(cborConverter.meta.mimeType).toBe('application/cbor');
    expect(cborConverter.meta.extension).toBe('cbor');
    expect(cborConverter.meta.binary).toBe(true);
  });
});
