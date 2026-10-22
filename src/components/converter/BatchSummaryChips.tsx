import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface BatchSummaryChipsProps {
  queuedCount: number;
  doneCount: number;
  errorCount: number;
}

export function BatchSummaryChips({ queuedCount, doneCount, errorCount }: BatchSummaryChipsProps) {
  const { t } = useTranslation();
  return (
    <div
      className="text-muted-foreground flex flex-wrap items-center gap-2 px-6 pb-3 font-mono text-[11px]"
      role="status"
      aria-live="polite"
    >
      <Chip label={t('batch.stat.queued')} value={queuedCount} />
      <Chip label={t('batch.stat.done')} value={doneCount} tone="ok" />
      {errorCount > 0 && <Chip label={t('batch.stat.failed')} value={errorCount} tone="err" />}
    </div>
  );
}

function Chip({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'err' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
        tone === 'ok' && 'bg-success/10 text-success',
        tone === 'err' && 'bg-destructive/10 text-destructive',
        !tone && 'bg-muted',
      )}
    >
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </span>
  );
}
