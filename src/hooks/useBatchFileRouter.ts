import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import type { Direction } from '@/components/converter/DirectionToggle';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
import { filterByExtension, getAllowedExtensions } from '@/lib/file-filter';
import { useTauriDragDrop } from '@/hooks/useTauriDragDrop';
import { useBatchStore } from '@/stores/batchStore';

// Routes a multi-file drop into the batch queue (with format filtering and
// toasts) and wires the native Tauri drag-drop bridge to the same handler.
export function useBatchFileRouter(
  format: FormatId,
  direction: Direction,
  onFilesAdded?: () => void,
): (files: File[]) => void {
  const { t } = useTranslation();
  const addBatchFiles = useBatchStore((s) => s.addFiles);

  const handleMultiFileDrop = useCallback(
    (files: File[]) => {
      const allowed = getAllowedExtensions(
        direction === 'reverse' ? 'reverse' : 'forward',
        getConverter(format).meta.extension,
      );
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
          toast.warning(t('batch.toast.skipped', { count: result.skipped, max: 500 }));
        }
      }
    },
    [addBatchFiles, direction, format, t, onFilesAdded],
  );

  // Native OS drag-drop bridge (no-op outside Tauri).
  useTauriDragDrop(handleMultiFileDrop);

  return handleMultiFileDrop;
}
