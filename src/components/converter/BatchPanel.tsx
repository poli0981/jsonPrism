import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Download, FileStack, FolderOpen, Play, StopCircle, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { useBatchActions } from '@/hooks/useBatchActions';
import { useFileAccept } from '@/hooks/useFileAccept';
import { filterByExtension } from '@/lib/file-filter';
import { isTauri, nativeOpenFiles, fileFromNativePath } from '@/lib/tauri';
import { cn } from '@/lib/utils';
import { useBatchStore, BATCH_MAX_FILES } from '@/stores/batchStore';
import type { FormatId } from '@/converters/types';
import type { Direction } from './DirectionToggle';
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
  const items = useBatchStore((s) => s.items);
  const itemOrder = useBatchStore((s) => s.itemOrder);
  const processing = useBatchStore((s) => s.processing);
  const addFiles = useBatchStore((s) => s.addFiles);
  const removeItem = useBatchStore((s) => s.removeItem);
  const clear = useBatchStore((s) => s.clear);
  const resetStatuses = useBatchStore((s) => s.resetStatuses);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalCount = itemOrder.length;
  const doneCount = itemOrder.filter((id) => items[id]?.status === 'done').length;
  const errorCount = itemOrder.filter((id) => items[id]?.status === 'error').length;
  const queuedCount = itemOrder.filter((id) => items[id]?.status === 'queued').length;

  const { converter, isReverse, accept, fileInputAccept, allowedExtensions } = useFileAccept(
    format,
    direction,
  );
  const { start, cancel, downloadZip } = useBatchActions(format, direction, options);

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
          <BatchSummaryChips
            queuedCount={queuedCount}
            doneCount={doneCount}
            errorCount={errorCount}
          />
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
                onClick={cancel}
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
                  void start();
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
              onClick={() => void downloadZip()}
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
