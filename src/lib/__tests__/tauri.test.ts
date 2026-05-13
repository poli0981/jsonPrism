import { describe, expect, it } from 'vitest';
import { pathHashAsMillis } from '../tauri';

describe('pathHashAsMillis', () => {
  it('is deterministic for the same input', () => {
    const a = pathHashAsMillis('C:/Users/me/data.json');
    const b = pathHashAsMillis('C:/Users/me/data.json');
    expect(a).toBe(b);
  });

  it('produces different hashes for different paths', () => {
    expect(pathHashAsMillis('/a/foo.json')).not.toBe(pathHashAsMillis('/a/bar.json'));
    expect(pathHashAsMillis('/a/foo.json')).not.toBe(pathHashAsMillis('/b/foo.json'));
  });

  it('returns a non-negative integer (unsigned 32-bit) even for empty input', () => {
    const h = pathHashAsMillis('');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});
