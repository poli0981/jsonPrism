import { describe, expect, it } from 'vitest';
import { isChunkLoadError } from '../chunk-error';

describe('isChunkLoadError', () => {
  it('detects dynamic-import / chunk load failures', () => {
    expect(
      isChunkLoadError(new Error('Failed to fetch dynamically imported module: /assets/x.js')),
    ).toBe(true);
    expect(isChunkLoadError(new Error('Loading chunk 5 failed'))).toBe(true);
    expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isChunkLoadError('importing a module script failed')).toBe(true);
  });

  it('ignores unrelated errors and falsy values', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
