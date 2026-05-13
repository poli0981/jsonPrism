import { useTranslation } from 'react-i18next';
import { modKey } from '@/hooks/useKeyboardShortcuts';

interface StatusBarProps {
  inputBytes: number;
  outputBytes: number;
  parseMs: number | null;
}

export function StatusBar({ inputBytes, outputBytes, parseMs }: StatusBarProps) {
  const { t } = useTranslation();

  return (
    <div className="text-muted-foreground border-border/60 flex items-center justify-between border-t px-3 py-1.5 font-mono text-[11px]">
      <div className="flex gap-3">
        <Stat label={t('status.in')} value={formatBytes(inputBytes)} />
        <Stat label={t('status.out')} value={formatBytes(outputBytes)} />
        {parseMs !== null && <Stat label={t('status.time')} value={`${parseMs.toFixed(1)}ms`} />}
      </div>
      <div className="hidden gap-3 md:flex">
        <Shortcut keys={`${modKey()}+K`} label={t('shortcut.clear')} />
        <Shortcut keys={`${modKey()}+S`} label={t('shortcut.download')} />
        <Shortcut keys={`${modKey()}+,`} label={t('shortcut.settings')} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="opacity-60">{label}:</span>
      <span className="text-foreground/80">{value}</span>
    </span>
  );
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="border-border bg-muted/40 text-foreground/80 rounded border px-1 py-0 text-[10px] leading-none">
        {keys}
      </kbd>
      <span className="opacity-60">{label}</span>
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
