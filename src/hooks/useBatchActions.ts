import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import type { Direction } from '@/components/converter/DirectionToggle';
import type { FormatId } from '@/converters/types';
import { downloadBlob, processBatch, zipOutputs } from '@/lib/batch-processor';
import { isTauri, nativeSaveBlob } from '@/lib/tauri';
import { useBatchStore, type BatchItem } from '@/stores/batchStore';

export function useBatchActions(
  format: FormatId,
  direction: Direction,
  options: Record<string, unknown>,
) {
  const { t } = useTranslation();
  const items = useBatchStore((s) => s.items);
  const itemOrder = useBatchStore((s) => s.itemOrder);
  const setProcessing = useBatchStore((s) => s.setProcessing);
  const setAbortController = useBatchStore((s) => s.setAbortController);
  const updateItem = useBatchStore((s) => s.updateItem);

  const start = useCallback(async () => {
    const queued = itemOrder
      .map((id) => items[id])
      .filter((it): it is BatchItem => !!it && it.status !== 'done' && it.status !== 'processing');

    if (queued.length === 0) {
      toast.info(t('batch.toast.nothing_to_process'));
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setProcessing(true);
    toast.success(t('batch.toast.started', { count: queued.length }));

    try {
      await processBatch(
        queued,
        format,
        options,
        {
          onUpdate: (id, patch) => updateItem(id, patch),
        },
        controller.signal,
        direction,
      );
      if (!controller.signal.aborted) {
        toast.success(t('batch.toast.finished'));
      }
    } catch (err) {
      toast.error(t('batch.toast.failed', { message: (err as Error).message }));
    } finally {
      setProcessing(false);
      setAbortController(null);
    }
  }, [
    direction,
    format,
    items,
    itemOrder,
    options,
    setAbortController,
    setProcessing,
    t,
    updateItem,
  ]);

  const cancel = useCallback(() => {
    useBatchStore.getState().abortController?.abort();
    toast.info(t('batch.toast.cancelled'));
  }, [t]);

  const downloadZip = useCallback(async () => {
    const done = itemOrder.map((id) => items[id]).filter((it): it is BatchItem => !!it);
    try {
      const { blob, fileCount } = await zipOutputs(done, format, direction);
      const ts = new Date().toISOString().slice(0, 10);
      const filename = `jsonprism-batch-${ts}.zip`;
      if (isTauri()) {
        const saved = await nativeSaveBlob(blob, filename);
        if (saved) {
          toast.success(t('batch.toast.zipped', { count: fileCount }));
        }
      } else {
        downloadBlob(blob, filename);
        toast.success(t('batch.toast.zipped', { count: fileCount }));
      }
    } catch (err) {
      toast.error(t('batch.toast.zip_failed', { message: (err as Error).message }));
    }
  }, [direction, format, items, itemOrder, t]);

  return { start, cancel, downloadZip };
}
