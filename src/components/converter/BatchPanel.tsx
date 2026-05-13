import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Download, FileStack, FolderOpen, Loader2, Play, StopCircle, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { useBatchStore, BATCH_MAX_FILES, type BatchItem } from '@/stores/batchStore';
import { processBatch, zipOutputs, downloadBlob } from '@/lib/batch-processor';
import { filterByExtension, getAllowedExtensions } from '@/lib/file-filter';
import { isTauri, nativeOpenFiles, nativeSaveBlob, fileFromNativePath } from '@/lib/tauri';
import { getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
import { cn } from '@/lib/utils';
import type { Direction } from './DirectionToggle';

interface BatchPanelProps {
  format: FormatId;
  direction: Direction;
  options: Record<string, unknown>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Filenames added via this trigger button are also routed into the queue. */
  onAddExternalFiles?: (files: File[]) => void;
}

export function BatchPanel({ format, direction, options, open, onOpenChange }: BatchPanelProps) {
  const { t } = useTranslation();
  const items = useBatchStore((s) => s.items);
  const itemOrder = useBatchStore((s) => s.itemOrder);
  const processing = useBatchStore((s) => s.processing);
  const addFiles = useBatchStore((s) => s.addFiles);
  const removeItem = useBatchStore((s) => s.removeItem);
  const clear = useBatchStore((s) => s.clear);
  const setProcessing = useBatchStore((s) => s.setProcessing);
  const setAbortController = useBatchStore((s) => s.setAbortController);
  const updateItem = useBatchStore((s) => s.updateItem);
  const resetStatuses = useBatchStore((s) => s.resetStatuses);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = itemOrder.length;
  const doneCount = itemOrder.filter((id) => items[id]?.status === 'done').length;
  const errorCount = itemOrder.filter((id) => items[id]?.status === 'error').length;
  const queuedCount = itemOrder.filter((id) => items[id]?.status === 'queued').length;

  const isReverse = direction === 'reverse';
  const converter = getConverter(format);
  const accept = useMemo(() => {
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

  // Whitelist of file extensions that match the current direction × format.
  // The browser's native `<input accept>` is only a hint, so we re-validate
  // in JS to reject files chosen via "Browse" with "All files" filter.
  const allowedExtensions = useMemo(
    () => getAllowedExtensions(isReverse ? 'reverse' : 'forward', converter.meta.extension),
    [isReverse, converter.meta.extension],
  );

  const handleAddFiles = useCallback(
    (files: File[]) => {
      const { valid, wrongFormat } = filterByExtension(files, allowedExtensions);
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
      if (accepted.length === 0) return;
      handleAddFiles(accepted);
    },
    [handleAddFiles],
  );

  const onDropRejected = useCallback(
    (rejections: { file: File }[]) => {
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

  const handleStart = useCallback(async () => {
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

  const handleCancel = useCallback(() => {
    useBatchStore.getState().abortController?.abort();
    toast.info(t('batch.toast.cancelled'));
  }, [t]);

  const handleDownloadZip = useCallback(async () => {
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

  const handleOpenFiles = async () => {
    if (isTauri()) {
      const paths = await nativeOpenFiles({ multiple: true });
      if (!paths || paths.length === 0) return;
      const files = await Promise.all(paths.map(fileFromNativePath));
      handleAddFiles(files);
      return;
    }
    fileInputRef.current?.click();
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleAddFiles(files);
    e.target.value = '';
  };

  // Cancel processing if the user clears the queue while it's running.
  useEffect(() => {
    if (totalCount === 0 && processing) {
      useBatchStore.getState().abortController?.abort();
    }
  }, [totalCount, processing]);

  const formatLabel = t(converter.meta.labelKey);
  // Direction-aware labels for the SheetDescription and dropzone text.
  // In reverse mode the user supplies `<format>` files and gets JSON back.
  const fromLabel = isReverse ? formatLabel : 'JSON';
  const toLabel = isReverse ? 'JSON' : formatLabel;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            'text-muted-foreground hover:bg-muted hover:text-foreground border-border/60 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition',
            totalCount > 0 && 'border-primary/40 text-foreground',
          )}
        >
          <FileStack className="h-3.5 w-3.5" />
          <span>{t('batch.trigger')}</span>
          {totalCount > 0 && (
            <span className="bg-primary/15 text-primary rounded px-1 py-px font-mono text-[10px] leading-none">
              {totalCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            <span className="text-spectrum italic">{t('batch.title')}</span>{' '}
            <span className="text-muted-foreground font-sans text-base font-normal not-italic">
              · {totalCount} / {BATCH_MAX_FILES}
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
          />
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-6 transition',
              isDragActive
                ? 'border-primary/60 bg-primary/5 text-foreground'
                : 'border-border bg-card/30 text-muted-foreground',
            )}
          >
            <FolderOpen className="h-5 w-5" />
            <p className="text-xs">
              {isDragActive
                ? t('batch.drop_active')
                : t('batch.drop_idle_format', { format: fromLabel })}
            </p>
            <button
              type="button"
              onClick={handleOpenFiles}
              className="text-primary text-xs hover:underline"
            >
              {t('batch.browse')}
            </button>
          </div>
        </div>

        {/* Summary chips */}
        {totalCount > 0 && (
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 px-6 pb-3 font-mono text-[11px]">
            <Chip label={t('batch.stat.queued')} value={queuedCount} />
            <Chip label={t('batch.stat.done')} value={doneCount} tone="ok" />
            {errorCount > 0 && (
              <Chip label={t('batch.stat.failed')} value={errorCount} tone="err" />
            )}
          </div>
        )}

        {/* Queue list */}
        <div className="flex-1 overflow-y-auto px-6 pb-3">
          {totalCount === 0 ? (
            <p className="text-muted-foreground py-12 text-center text-sm italic">
              {t('batch.empty_format', { format: fromLabel })}
            </p>
          ) : (
            <ul className="divide-border/40 flex flex-col divide-y">
              {itemOrder.map((id) => {
                const item = items[id];
                if (!item) return null;
                return (
                  <BatchItemRow
                    key={id}
                    item={item}
                    outputExt={isReverse ? 'json' : converter.meta.extension}
                    onRemove={() => removeItem(id)}
                    disabled={processing}
                  />
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer controls */}
        <div className="border-border/60 flex items-center justify-between gap-2 border-t px-6 py-3">
          <button
            type="button"
            onClick={() => clear()}
            disabled={totalCount === 0 || processing}
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('batch.clear')}
          </button>

          <div className="flex items-center gap-2">
            {processing ? (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition"
              >
                <StopCircle className="h-3.5 w-3.5" />
                {t('batch.cancel')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetStatuses();
                  void handleStart();
                }}
                disabled={totalCount === 0}
                className="bg-primary/15 text-primary hover:bg-primary/25 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="h-3.5 w-3.5" />
                {t('batch.process')}
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleDownloadZip()}
              disabled={doneCount === 0 || processing}
              className="bg-foreground/90 text-background hover:bg-foreground inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              {t('batch.download_zip')}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Chip({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'err' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
        tone === 'ok' && 'bg-primary/10 text-primary',
        tone === 'err' && 'bg-destructive/10 text-destructive',
        !tone && 'bg-muted/40',
      )}
    >
      <span className="opacity-70">{label}:</span>
      <span>{value}</span>
    </span>
  );
}

interface BatchItemRowProps {
  item: BatchItem;
  outputExt: string;
  onRemove: () => void;
  disabled: boolean;
}

function BatchItemRow({ item, outputExt, onRemove, disabled }: BatchItemRowProps) {
  const { t } = useTranslation();
  const Icon = statusIcon(item.status);
  const tone = statusTone(item.status);

  return (
    <li className="flex items-start gap-2 py-2.5">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground truncate font-mono text-xs">{item.filename}</span>
          <span className="text-muted-foreground/60 font-mono text-[10px]">→ .{outputExt}</span>
        </div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 font-mono text-[10px]">
          <span>{formatBytes(item.size)}</span>
          {item.outputSize !== undefined && (
            <>
              <span>·</span>
              <span>
                {t('batch.row.out')}: {formatBytes(item.outputSize)}
              </span>
            </>
          )}
        </div>
        {item.error && (
          <p className="text-destructive mt-1 font-mono text-[10px] break-words">{item.error}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={t('batch.row.remove')}
        className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}

function statusIcon(status: BatchItem['status']) {
  switch (status) {
    case 'queued':
      return CircleIcon;
    case 'processing':
      return ProcessingIcon;
    case 'done':
      return CheckIcon;
    case 'error':
      return ErrorIcon;
  }
}

function statusTone(status: BatchItem['status']): string {
  switch (status) {
    case 'done':
      return 'text-primary';
    case 'error':
      return 'text-destructive';
    case 'processing':
      return 'text-foreground';
    case 'queued':
    default:
      return 'text-muted-foreground/60';
  }
}

function CircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ProcessingIcon({ className }: { className?: string }) {
  return <Loader2 className={cn(className, 'animate-spin')} />;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path
        d="M3 8.5L6.5 12L13 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
