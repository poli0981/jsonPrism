import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/sonner';
import type { Direction, FormatId } from '@/converters/types';
import { processBatch, zipOutputs } from '@/lib/batch-processor';
import { downloadBlob } from '@/lib/download';
import type { Encoding } from '@/lib/bytes';
import { errorMessage } from '@/lib/errors';
import { isTauri, nativeSaveBlob } from '@/lib/tauri';
import { useBatchStore, type BatchItem } from '@/stores/batchStore';

/**
 * Collects per-item patches and applies them once per animation frame, so a
 * 500-file batch re-renders the queue a few dozen times instead of ~1,500.
 */
function createPatchBuffer() {
  const pending = new Map<string, Partial<BatchItem>>();
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    if (pending.size === 0) return;
    const batch = new Map(pending);
    pending.clear();
    useBatchStore.getState().updateItems(batch);
  };
  const schedule =
    typeof requestAnimationFrame === 'function'
      ? (fn: () => void) => requestAnimationFrame(fn)
      : (fn: () => void) => setTimeout(fn, 16);
  return {
    push(id: string, patch: Partial<BatchItem>) {
      pending.set(id, { ...pending.get(id), ...patch });
      if (!scheduled) {
        scheduled = true;
        schedule(flush);
      }
    },
    flush,
  };
}

export function useBatchActions(
  format: FormatId,
  direction: Direction,
  options: Record<string, unknown>,
) {
  const { t } = useTranslation();

  // Reads the store at call time (not from a render-time closure): the
  // Process button resets every row first, and a stale `items` snapshot used
  // to skip the rows it had just reset — wiping their output.
  const start = useCallback(async () => {
    const store = useBatchStore.getState();
    if (store.processing) return;
    store.resetStatuses();
    const { items, itemOrder } = useBatchStore.getState();
    const queued = itemOrder
      .map((id) => items[id])
      .filter((it): it is BatchItem => !!it && it.status === 'queued');

    if (queued.length === 0) {
      toast.info(t('batch.toast.nothing_to_process'));
      return;
    }

    const controller = new AbortController();
    store.setAbortController(controller);
    store.setProcessing(true);
    toast.success(t('batch.toast.started', { count: queued.length }));

    const buffer = createPatchBuffer();
    try {
      await processBatch(
        queued,
        format,
        options,
        { onUpdate: (id, patch) => buffer.push(id, patch) },
        controller.signal,
        direction,
      );
      buffer.flush();
      if (!controller.signal.aborted) {
        toast.success(t('batch.toast.finished'));
      }
    } catch (err) {
      buffer.flush();
      toast.error(t('batch.toast.failed', { message: errorMessage(err) }));
    } finally {
      const current = useBatchStore.getState();
      // Only clear the run we started — a newer run may own the store now.
      if (current.abortController === controller) {
        current.setProcessing(false);
        current.setAbortController(null);
      }
    }
  }, [direction, format, options, t]);

  const cancel = useCallback(() => {
    useBatchStore.getState().abortController?.abort();
    toast.info(t('batch.toast.cancelled'));
  }, [t]);

  const downloadZip = useCallback(async () => {
    const { items, itemOrder } = useBatchStore.getState();
    const all = itemOrder.map((id) => items[id]).filter((it): it is BatchItem => !!it);
    try {
      const encoding = (options['encoding'] as Encoding | undefined) ?? 'base64';
      const { blob, fileCount } = await zipOutputs(all, format, direction, encoding);
      const ts = new Date().toISOString().slice(0, 10);
      const filename = `jsonprism-batch-${ts}.zip`;
      if (isTauri()) {
        const saved = await nativeSaveBlob(blob, filename, {
          name: t('file_dialog.zip'),
          extensions: ['zip'],
        });
        if (saved) toast.success(t('batch.toast.zipped', { count: fileCount }));
      } else {
        downloadBlob(blob, filename);
        toast.success(t('batch.toast.zipped', { count: fileCount }));
      }
    } catch (err) {
      toast.error(t('batch.toast.zip_failed', { message: errorMessage(err) }));
    }
  }, [direction, format, options, t]);

  return { start, cancel, downloadZip };
}
