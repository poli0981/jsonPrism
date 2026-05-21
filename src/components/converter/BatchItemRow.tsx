import { useTranslation } from 'react-i18next';
import { Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/format-bytes';
import type { BatchItem } from '@/stores/batchStore';

interface BatchItemRowProps {
  item: BatchItem;
  outputExt: string;
  onRemove: () => void;
  disabled: boolean;
}

export function BatchItemRow({ item, outputExt, onRemove, disabled }: BatchItemRowProps) {
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
