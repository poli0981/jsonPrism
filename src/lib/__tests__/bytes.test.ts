import { describe, expect, it } from 'vitest';
import { decodeBytes, encodeBytes, utf8ByteLength } from '../bytes';

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

describe('bytes codec validation', () => {
  it('rejects non-hex characters instead of decoding them as 0', () => {
    expect(() => decodeBytes('zz', 'hex')).toThrow(/non-hex/i);
    expect(() => decodeBytes('1g', 'hex')).toThrow(/non-hex/i);
  });

  it('accepts a 0x prefix on hex', () => {
    expect(decodeBytes('0x00ff', 'hex')).toEqual(new Uint8Array([0, 255]));
  });

  it('accepts URL-safe base64 without padding', () => {
    // [251, 255] is "+/8=" in standard base64.
    expect(decodeBytes('-_8', 'base64')).toEqual(new Uint8Array([251, 255]));
  });

  it('turns malformed base64 into a readable error', () => {
    expect(() => decodeBytes('***', 'base64')).toThrow(/malformed/i);
  });

  it('encodes large buffers in chunks', () => {
    const big = new Uint8Array(200_000).map((_, i) => i % 256);
    expect(decodeBytes(encodeBytes(big, 'base64'), 'base64')).toEqual(big);
  });
});

describe('utf8ByteLength', () => {
  it('matches TextEncoder for ASCII, BMP and astral characters', () => {
    for (const s of ['', 'abc', 'xin chào', '日本語', '👋🏽', 'a\uD800b']) {
      expect(utf8ByteLength(s)).toBe(new TextEncoder().encode(s).length);
    }
  });
});
