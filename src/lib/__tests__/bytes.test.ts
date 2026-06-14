import { describe, expect, it } from 'vitest';
import { decodeBytes, encodeBytes } from '../bytes';

describe('bytes codec', () => {
  it('round-trips base64', () => {
    const src = new Uint8Array([0, 1, 2, 250, 255]);
    expect(decodeBytes(encodeBytes(src, 'base64'), 'base64')).toEqual(src);
  });

  it('round-trips hex and pads to two chars per byte', () => {
    const src = new Uint8Array([0, 15, 16, 255]);
    expect(encodeBytes(src, 'hex')).toBe('000f10ff');
    expect(decodeBytes('000f10ff', 'hex')).toEqual(src);
  });

  it('tolerates whitespace in hex input', () => {
    expect(decodeBytes('00 0f 10 ff', 'hex')).toEqual(new Uint8Array([0, 15, 16, 255]));
  });

  it('throws on odd-length hex', () => {
    expect(() => decodeBytes('abc', 'hex')).toThrow(/odd length/i);
  });
});
