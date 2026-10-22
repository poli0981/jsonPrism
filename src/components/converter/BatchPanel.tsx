import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useShallow } from 'zustand/react/shallow';
import { CircleStop, Download, FileStack, FolderOpen, Play, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { extensionsFor } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import { useBatchActions } from '@/hooks/useBatchActions';
import { useFileAccept } from '@/hooks/useFileAccept';
import { errorMessage } from '@/lib/errors';
import { filterByExtension } from '@/lib/file-filter';
import { fileFromNativePath, isTauri, nativeOpenFiles } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useBatchStore, BATCH_MAX_FILES } from '@/stores/batchStore';
import { BatchItemRow } from './BatchItemRow';
import { BatchSummaryChips } from './BatchSummaryChips';

interface BatchPanelProps {
  format: FormatId;
  direction: Direction;
  options: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BatchPanel({ format, direction, options, open, onOpenChange }: BatchPanelProps) {
  const { t } = useTranslation();
  // Counts and order only — each row subscribes to its own item, so a status
  // change re-renders one row instead of the whole 500-row list.
  const itemOrder = useBatchStore((s) => s.itemOrder);
  const counts = useBatchStore(
    useShallow((s) => {
      let done = 0;
      let failed = 0;
      let queued = 0;
      for (const id of s.itemOrder) {
        const status = s.items[id]?.status;
        if (status === 'done') done += 1;
        else if (status === 'error') failed += 1;
        else if (status === 'queued') queued += 1;
      }
      return { done, failed, queued };
    }),
  );
  const processing = useBatchStore((s) => s.processing);
  const addFiles = useBatchStore((s) => s.addFiles);
  const removeItem = useBatchStore((s) => s.removeItem);
  const clear = useBatchStore((s) => s.clear);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalCount = itemOrder.length;

  const { converter, isReverse, accept, fileInputAccept, allowedExtensions } = useFileAccept(
    format,
    direction,
  );
  const { start, cancel, downloadZip } = useBatchActions(format, direction, options);

  const handleAddFiles = useCallback(
    (files: File[], lenientExt = false) => {
      const { valid, wrongFormat } = filterByExtension(files, allowedExtensions, lenientExt);
      if (wrongFormat > 0) {
        toast.warning(t('batch.toast.wrong_format', { count: wrongFormat }));
      }
      if (valid.length === 0) return;
      const result = addFiles(valid);
      if (result.added > 0) {
        toast.success(t('batch.toast.added', { count: result.added }));
      }
      if (result.skipped > 0) {
        if (result.reason === 'duplicate') {
          toast.warning(t('batch.toast.duplicate', { count: result.skipped }));
        } else {
          toast.warning(t('batch.toast.skipped', { count: result.skipped, max: BATCH_MAX_FILES }));
        }
      }
    },
    [addFiles, allowedExtensions, t],
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) handleAddFiles(accepted);
    },
    [handleAddFiles],
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      // react-dropzone rejects via MIME mismatch; surface as wrong-format toast
      // so the user sees something, not a silent drop.
      if (rejections.length > 0) {
        toast.warning(t('batch.toast.wrong_format', { count: rejections.length }));
      }
    },
    [t],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });

  const formatLabel = t(converter.meta.labelKey);

  const handleOpenFiles = async () => {
    if (!isTauri()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const paths = await nativeOpenFiles({
        multiple: true,
        filters: isReverse
          ? [
              { name: formatLabel, extensions: extensionsFor(format) },
              { name: t('file_dialog.text'), extensions: ['txt'] },
            ]
          : [
              { name: t('file_dialog.json'), extensions: ['json'] },
              { name: t('file_dialog.text'), extensions: ['txt'] },
            ],
      });
      if (!paths || paths.length === 0) return;
      const files = await Promise.all(paths.map(fileFromNativePath));
      // The native dialog already filtered; Android content URIs may carry no
      // extension, so don't re-reject them here.
      handleAddFiles(files, true);
    } catch (err) {
      toast.error(t('toast.file_failed', { message: errorMessage(err) }));
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length > 0) handleAddFiles(files);
  };

  // Cancel processing if the user clears the queue while it's running.
  useEffect(() => {
    if (totalCount === 0 && processing) {
      useBatchStore.getState().abortController?.abort();
    }
  }, [totalCount, processing]);

  const removeRow = useCallback((id: string) => removeItem(id), [removeItem]);
  // Direction-aware labels: in reverse mode the user supplies `<format>` files
  // and gets JSON back.
  const fromLabel = isReverse ? formatLabel : 'JSON';
  const toLabel = isReverse ? 'JSON' : formatLabel;
  const outputExt = isReverse ? 'json' : converter.meta.extension;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            'group text-muted-foreground hover:bg-muted hover:text-foreground border-border bg-card/60 inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition',
            totalCount > 0 && 'border-primary/40 text-foreground',
          )}
        >
          <FileStack className="motion-safe:group-hover:animate-bob h-3.5 w-3.5" aria-hidden />
          <span>{t('batch.trigger')}</span>
          {totalCount > 0 && (
            <span className="bg-primary/15 text-primary rounded px-1 py-px font-mono text-[10px] leading-none">
              {totalCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent
        closeLabel={t('common.close')}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>
            <span className="text-spectrum">{t('batch.title')}</span>{' '}
            <span className="text-muted-foreground font-mono text-sm font-normal">
              {totalCount} / {BATCH_MAX_FILES}
            </span>
          </SheetTitle>
          <SheetDescription>
            {t('batch.description', { from: fromLabel, to: toLabel })}
          </SheetDescription>
        </SheetHeader>

        {/* Drop zone */}
        <div className="px-6 pb-3" {...getRootProps()}>
          <input {...getInputProps()} />
          <input
            ref={fileInputRef}
            type="file"
            accept={fileInputAccept}
            multiple
            className="hidden"
            onChange={onFileInputChange}
            tabIndex={-1}
            aria-hidden
          />
          <div
            className={cn(
              'corner-ticks flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-6 transition',
              isDragActive
                ? 'border-primary/60 bg-primary/5 text-foreground'
                : 'border-border bg-card/40 text-muted-foreground',
            )}
          >
            <FolderOpen
              className={cn('h-5 w-5', isDragActive && 'motion-safe:animate-bob')}
              aria-hidden
            />
            <p className="text-xs">
              {isDragActive
                ? t('batch.drop_active')
                : t('batch.drop_idle_format', { format: fromLabel })}
            </p>
            <button
              type="button"
              onClick={() => void handleOpenFiles()}
              className="text-primary min-h-8 px-2 text-xs hover:underline"
            >
              {t('batch.browse')}
            </button>
          </div>
        </div>

        {totalCount > 0 && (
          <BatchSummaryChips
            queuedCount={counts.queued}
            doneCount={counts.done}
            errorCount={counts.failed}
          />
        )}

        {/* Queue list */}
        <div
          className="flex-1 [scrollbar-gutter:stable] overflow-y-auto px-6 pb-3"
          tabIndex={0}
          aria-label={t('batch.queue_label')}
        >
          {totalCount === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm">
              {t('batch.empty_format', { format: fromLabel })}
            </p>
          ) : (
            <ul className="divide-border/50 flex flex-col divide-y">
              {itemOrder.map((id) => (
                <BatchItemRow
                  key={id}
                  id={id}
                  outputExt={outputExt}
                  onRemove={removeRow}
                  disabled={processing}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Footer controls */}
        <div className="border-border/70 flex items-center justify-between gap-2 border-t px-6 py-3">
          <button
            type="button"
            onClick={() => clear()}
            disabled={totalCount === 0 || processing}
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            {t('batch.clear')}
          </button>

          <div className="flex items-center gap-2">
            {processing ? (
              <button
                type="button"
                onClick={cancel}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition"
              >
                <CircleStop className="h-3.5 w-3.5" aria-hidden />
                {t('batch.cancel')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void start()}
                disabled={totalCount === 0}
                className="group bg-primary/15 text-primary hover:bg-primary/25 inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="motion-safe:group-hover:animate-nudge h-3.5 w-3.5" aria-hidden />
                {t('batch.process')}
              </button>
            )}

            <button
              type="button"
              onClick={() => void downloadZip()}
              disabled={counts.done === 0 || processing}
              className="group bg-foreground/90 text-background hover:bg-foreground inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="motion-safe:group-hover:animate-bob h-3.5 w-3.5" aria-hidden />
              {t('batch.download_zip')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
