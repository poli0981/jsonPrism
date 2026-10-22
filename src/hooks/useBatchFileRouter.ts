import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import { extensionsFor } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { filterByExtension, getAllowedExtensions } from '@/lib/file-filter';
import { useTauriDragDrop } from '@/hooks/useTauriDragDrop';
import { BATCH_MAX_FILES, useBatchStore } from '@/stores/batchStore';

/**
 * Routes dropped files: one file loads into the editor (same as the web
 * dropzone), several go to the batch queue (with format filtering and toasts).
 * Also wires the native Tauri drag-drop bridge to the same handler.
 */
export function useBatchFileRouter(
  format: FormatId,
  direction: Direction,
  onSingleFile: (file: File) => void,
  onFilesAdded?: () => void,
): (files: File[]) => void {
  const { t } = useTranslation();
  const addBatchFiles = useBatchStore((s) => s.addFiles);

  const handleMultiFileDrop = useCallback(
    (files: File[]) => {
      const allowed = getAllowedExtensions(direction, extensionsFor(format));
      const { valid, wrongFormat } = filterByExtension(files, allowed);
      if (wrongFormat > 0) {
        toast.warning(t('batch.toast.wrong_format', { count: wrongFormat }));
      }
      if (valid.length === 0) return;
      const result = addBatchFiles(valid);
      if (result.added > 0) {
        toast.success(t('batch.toast.added', { count: result.added }));
        onFilesAdded?.();
      }
      if (result.skipped > 0) {
        if (result.reason === 'duplicate') {
          toast.warning(t('batch.toast.duplicate', { count: result.skipped }));
        } else {
          toast.warning(t('batch.toast.skipped', { count: result.skipped, max: BATCH_MAX_FILES }));
        }
      }
    },
    [addBatchFiles, direction, format, t, onFilesAdded],
  );

  const handleNativeDrop = useCallback(
    (files: File[]) => {
      if (files.length === 1) onSingleFile(files[0]!);
      else handleMultiFileDrop(files);
    },
    [handleMultiFileDrop, onSingleFile],
  );

  // Native OS drag-drop bridge (no-op outside Tauri).
  useTauriDragDrop(handleNativeDrop);

  return handleMultiFileDrop;
}
