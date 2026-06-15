import { describe, expect, it } from 'vitest';
import { basenameFromPath, pathHashAsMillis } from '../tauri';

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

describe('basenameFromPath', () => {
  it('returns the basename of a desktop path unchanged', () => {
    expect(basenameFromPath('C:\\Users\\me\\data.json')).toBe('data.json');
    expect(basenameFromPath('/home/me/data.json')).toBe('data.json');
    expect(basenameFromPath('data.json')).toBe('data.json');
  });

  it('decodes an Android content URI with an embedded raw path', () => {
    // What plugin-dialog returns for a file picked from Downloads.
    const uri =
      'content://com.android.providers.downloads.documents/document/' +
      'raw%3A%2Fstorage%2Femulated%2F0%2FDownload%2Ftest-open.json';
    expect(basenameFromPath(uri)).toBe('test-open.json');
  });

  it('collapses an opaque document id to a short token', () => {
    const uri = 'content://com.android.providers.media.documents/document/msf%3A1000000123';
    expect(basenameFromPath(uri)).toBe('1000000123');
  });

  it('survives a malformed percent-escape by falling back to the raw basename', () => {
    expect(basenameFromPath('/tmp/100%-done.json')).toBe('100%-done.json');
  });
});
