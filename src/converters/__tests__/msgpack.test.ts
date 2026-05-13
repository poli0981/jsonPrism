import { describe, expect, it } from 'vitest';
import { decode } from '@msgpack/msgpack';
import { msgpackConverter } from '../msgpack';
import { decodeBytes } from '../bson';

describe('msgpackConverter', () => {
  it('round-trips an object', () => {
    const data = { id: 1, name: 'alpha' };
    const result = msgpackConverter.convert({ data }, { encoding: 'base64' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(decode(decodeBytes(result.output, 'base64'))).toEqual(data);
  });

  it('round-trips an array via hex', () => {
    const data = [{ a: 1 }, { a: 2 }];
    const result = msgpackConverter.convert({ data }, { encoding: 'hex' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(decode(decodeBytes(result.output, 'hex'))).toEqual(data);
  });

  it('round-trips strings with non-ASCII bytes', () => {
    const data = { greeting: 'xin chào 👋' };
    const result = msgpackConverter.convert({ data }, { encoding: 'base64' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(decode(decodeBytes(result.output, 'base64'))).toEqual(data);
  });

  it('declares MessagePack mime type and extension', () => {
    expect(msgpackConverter.meta.mimeType).toBe('application/x-msgpack');
    expect(msgpackConverter.meta.extension).toBe('msgpack');
    expect(msgpackConverter.meta.binary).toBe(true);
  });
});
