import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format-bytes';
import { useBatchStore, type BatchItemStatus } from '@/stores/batchStore';

interface BatchItemRowProps {
  id: string;
  outputExt: string;
  onRemove: (id: string) => void;
  disabled: boolean;
}

/** One queue row. Subscribes to its own item so updates re-render only this row. */
export const BatchItemRow = memo(function BatchItemRow({
  id,
  outputExt,
  onRemove,
  disabled,
}: BatchItemRowProps) {
  const { t } = useTranslation();
  const item = useBatchStore((s) => s.items[id]);
  if (!item) return null;

  const error = item.errorCode ? t(`batch.error.${item.errorCode}`) : item.error;

  return (
    <li className="flex items-start gap-2 py-2.5">
      <StatusIcon status={item.status} />
      <span className="sr-only">{t(`batch.stat.${item.status}`)}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-foreground truncate font-mono text-xs">{item.filename}</span>
          <span className="text-muted-foreground font-mono text-[10px]">→ .{outputExt}</span>
        </div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 font-mono text-[10px]">
          <span>{formatBytes(item.size)}</span>
          {item.outputSize !== undefined && (
            <>
              <span aria-hidden>·</span>
              <span>{t('batch.row.out_value', { size: formatBytes(item.outputSize) })}</span>
            </>
          )}
        </div>
        {error && (
          <p className="text-destructive mt-1 font-mono text-[10px] break-words">{error}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(id)}
        disabled={disabled}
        aria-label={t('batch.row.remove', { name: item.filename })}
        className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 shrink-0 items-center justify-center rounded transition disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    </li>
  );
});

function StatusIcon({ status }: { status: BatchItemStatus }) {
  const base = 'mt-0.5 h-4 w-4 shrink-0';
  switch (status) {
    case 'processing':
      return (
        <LoaderCircle
          className={cn(base, 'text-foreground motion-safe:animate-spin')}
          aria-hidden
        />
      );
    case 'done':
      return (
        <svg viewBox="0 0 16 16" fill="none" className={cn(base, 'text-success')} aria-hidden>
          <path
            d="M3 8.5L6.5 12L13 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'error':
      return (
        <svg viewBox="0 0 16 16" fill="none" className={cn(base, 'text-destructive')} aria-hidden>
          <path
            d="M4 4L12 12M12 4L4 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'queued':
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={cn(base, 'text-muted-foreground')}
          aria-hidden
        >
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
}
