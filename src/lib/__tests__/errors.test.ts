import { describe, expect, it } from 'vitest';
import { errorMessage } from '@/lib/errors';

describe('errorMessage', () => {
  it('returns the message of an Error', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage(new TypeError('x is not a function'))).toBe('x is not a function');
  });

  it('falls back to the error name when the message is empty', () => {
    expect(errorMessage(new RangeError())).toBe('RangeError');

    class QuotaError extends Error {
      constructor() {
        super('');
        this.name = 'QuotaError';
      }
    }
    expect(errorMessage(new QuotaError())).toBe('QuotaError');
  });

  it('returns thrown strings unchanged', () => {
    expect(errorMessage('plain failure')).toBe('plain failure');
    expect(errorMessage('')).toBe('');
  });

  it('serialises plain objects and primitives as JSON', () => {
    expect(errorMessage({ code: 42, reason: 'nope' })).toBe('{"code":42,"reason":"nope"}');
    expect(errorMessage(['a', 1])).toBe('["a",1]');
    expect(errorMessage(42)).toBe('42');
    expect(errorMessage(null)).toBe('null');
    expect(errorMessage(false)).toBe('false');
  });

  it('uses String() for values JSON cannot represent instead of printing nothing', () => {
    expect(errorMessage(undefined)).toBe('undefined');
    expect(errorMessage(Symbol('lost'))).toBe('Symbol(lost)');
  });

  it('uses String() when JSON serialisation throws', () => {
    const circular: Record<string, unknown> = { name: 'loop' };
    circular['self'] = circular;
    expect(errorMessage(circular)).toBe('[object Object]');
    expect(errorMessage(10n)).toBe('10');
  });
});
