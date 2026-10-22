import { useMemo } from 'react';
import { extensionsFor, getConverter } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { getAllowedExtensions } from '@/lib/file-filter';

export interface FileAccept {
  converter: ReturnType<typeof getConverter>;
  isReverse: boolean;
  /** react-dropzone `accept` map: MIME type → extensions. */
  accept: Record<string, string[]>;
  /** Native `<input accept>` hint string. */
  fileInputAccept: string;
  /** Whitelist for JS-side re-validation — `<input accept>` is only a hint. */
  allowedExtensions: string[];
}

export function useFileAccept(format: FormatId, direction: Direction): FileAccept {
  const isReverse = direction === 'reverse';
  const converter = getConverter(format);

  return useMemo(() => {
    const allowedExtensions = getAllowedExtensions(direction, extensionsFor(format));
    const dotted = allowedExtensions.map((ext) => `.${ext}`);
    const accept: Record<string, string[]> = isReverse
      ? {
          [converter.meta.mimeType]: dotted.filter((e) => e !== '.txt'),
          'text/plain': ['.txt'],
        }
      : { 'application/json': ['.json'], 'text/plain': ['.txt'] };
    const fileInputAccept = isReverse
      ? [...dotted, converter.meta.mimeType].join(',')
      : '.json,.txt,application/json';
    return { converter, isReverse, accept, fileInputAccept, allowedExtensions };
  }, [converter, direction, format, isReverse]);
}
