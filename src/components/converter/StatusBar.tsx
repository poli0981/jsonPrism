import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import { modKey } from '@/hooks/useKeyboardShortcuts';
import { formatBytes } from '@/lib/format-bytes';
import { cn } from '@/lib/utils';

export type ConversionState = 'idle' | 'working' | 'ok' | 'error';

interface StatusBarProps {
  state: ConversionState;
  inputBytes: number;
  outputBytes: number;
  ms: number | null;
  precisionLoss: boolean;
}

const DOT_TONE: Record<ConversionState, string> = {
  idle: 'bg-muted-foreground/50',
  working: 'bg-warning motion-safe:animate-pulse-dot',
  ok: 'bg-success',
  error: 'bg-destructive',
};

/** Terminal-style footer: state light, bytes in → out, timing, encoding, shortcuts. */
export function StatusBar({ state, inputBytes, outputBytes, ms, precisionLoss }: StatusBarProps) {
  const { t } = useTranslation();

  return (
    <div className="border-border/70 text-muted-foreground flex items-center justify-between gap-3 border-t px-3 py-1 font-mono text-[11px]">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5" aria-live="polite">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', DOT_TONE[state])} />
          <span className="text-foreground">{t(`status.state.${state}`)}</span>
        </span>
        <span>
          {t('status.in')} <span className="text-foreground">{formatBytes(inputBytes)}</span>
        </span>
        <span aria-hidden>→</span>
        <span>
          {t('status.out')} <span className="text-foreground">{formatBytes(outputBytes)}</span>
        </span>
        {ms !== null && <span>{t('status.time_value', { ms: ms.toFixed(1) })}</span>}
        {precisionLoss && (
          <span
            className="text-warning inline-flex items-center gap-1"
            title={t('status.precision_hint')}
          >
            <TriangleAlert className="h-3 w-3" aria-hidden />
            {t('status.precision')}
          </span>
        )}
      </div>
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        <span>UTF-8</span>
        <Shortcut keys={`${modKey()}+S`} label={t('shortcut.download')} />
        <Shortcut keys={`${modKey()}+,`} label={t('shortcut.settings')} />
      </div>
    </div>
  );
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="kbd">{keys}</kbd>
      <span>{label}</span>
    </span>
  );
}
