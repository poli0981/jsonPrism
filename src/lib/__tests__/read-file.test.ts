import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileText } from '../read-file';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Minimal FileReader stand-in that settles the way the test asks it to. */
function stubFileReader(outcome: 'error' | 'null-result') {
  class FakeFileReader {
    result: string | ArrayBuffer | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsText(): void {
      queueMicrotask(() => {
        if (outcome === 'error') this.onerror?.();
        else this.onload?.();
      });
    }
  }
  vi.stubGlobal('FileReader', FakeFileReader);
}

describe('readFileText', () => {
  it('resolves with the decoded UTF-8 text of the file', async () => {
    const file = new File(['{"name":"Tunic","emoji":"✨"}'], 'game.json', {
      type: 'application/json',
    });
    await expect(readFileText(file)).resolves.toBe('{"name":"Tunic","emoji":"✨"}');
  });

  it('resolves with an empty string for an empty file', async () => {
    await expect(readFileText(new File([], 'empty.json'))).resolves.toBe('');
  });

  it('rejects with the file name when the reader fails', async () => {
    stubFileReader('error');
    await expect(readFileText(new File(['x'], 'broken.yaml'))).rejects.toThrow(
      'Cannot read file: broken.yaml',
    );
  });

  it('treats a missing reader result as empty text', async () => {
    stubFileReader('null-result');
    await expect(readFileText(new File(['x'], 'odd.json'))).resolves.toBe('');
  });
});
