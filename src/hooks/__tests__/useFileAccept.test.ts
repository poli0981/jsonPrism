import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { getConverter } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { useFileAccept } from '../useFileAccept';

function accept(format: FormatId, direction: Direction) {
  return renderHook(() => useFileAccept(format, direction)).result.current;
}

describe('useFileAccept', () => {
  it('accepts only JSON (and .txt) going forward, whatever the target format', () => {
    for (const format of ['csv', 'yaml', 'bson'] as const) {
      const result = accept(format, 'forward');
      expect(result.isReverse).toBe(false);
      expect(result.converter).toBe(getConverter(format));
      expect(result.accept).toEqual({
        'application/json': ['.json'],
        'text/plain': ['.txt'],
      });
      expect(result.fileInputAccept).toBe('.json,.txt,application/json');
      expect(result.allowedExtensions).toEqual(['json', 'txt']);
    }
  });

  it("accepts the format's own extensions (aliases included) going back", () => {
    const result = accept('yaml', 'reverse');
    expect(result.isReverse).toBe(true);
    expect(result.accept).toEqual({
      'application/yaml': ['.yaml', '.yml'],
      'text/plain': ['.txt'],
    });
    expect(result.fileInputAccept).toBe('.yaml,.yml,.txt,application/yaml');
    expect(result.allowedExtensions).toEqual(['yaml', 'yml', 'txt']);
  });

  it('keys the dropzone map by the format MIME type', () => {
    const result = accept('jsonl', 'reverse');
    expect(result.accept).toEqual({
      'application/x-ndjson': ['.jsonl', '.ndjson'],
      'text/plain': ['.txt'],
    });
    expect(result.fileInputAccept).toBe('.jsonl,.ndjson,.txt,application/x-ndjson');
  });

  it('returns a stable object until format or direction change', () => {
    const { result, rerender } = renderHook(
      ({ format, direction }: { format: FormatId; direction: Direction }) =>
        useFileAccept(format, direction),
      { initialProps: { format: 'csv', direction: 'reverse' } },
    );
    const first = result.current;
    rerender({ format: 'csv', direction: 'reverse' });
    expect(result.current).toBe(first);

    rerender({ format: 'csv', direction: 'forward' });
    expect(result.current).not.toBe(first);
    expect(result.current.allowedExtensions).toEqual(['json', 'txt']);

    rerender({ format: 'tsv', direction: 'reverse' });
    expect(result.current.allowedExtensions).toEqual(['tsv', 'tab', 'txt']);
  });
});
