import { useMemo } from 'react';
import type { Direction } from '@/components/converter/DirectionToggle';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
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

  const accept = useMemo<Record<string, string[]>>(() => {
    if (isReverse) {
      return {
        [converter.meta.mimeType]: [`.${converter.meta.extension}`],
        'text/plain': ['.txt'],
      };
    }
    return { 'application/json': ['.json'], 'text/plain': ['.txt'] };
  }, [isReverse, converter.meta.mimeType, converter.meta.extension]);

  const fileInputAccept = isReverse
    ? `.${converter.meta.extension},.txt,${converter.meta.mimeType}`
    : '.json,.txt,application/json';

  const allowedExtensions = useMemo(
    () => getAllowedExtensions(isReverse ? 'reverse' : 'forward', converter.meta.extension),
    [isReverse, converter.meta.extension],
  );

  return { converter, isReverse, accept, fileInputAccept, allowedExtensions };
}
