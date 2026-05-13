import { useTranslation } from 'react-i18next';
import { ALL_FORMATS, getConverter } from '@/converters/registry';
import type { FormatId } from '@/converters/types';
import type { JsonShape } from '@/lib/detect';
import { isFormatSuggested } from '@/lib/suggestions';
import { cn } from '@/lib/utils';
import type { Direction } from './DirectionToggle';

interface FormatPickerProps {
  value: FormatId;
  onChange: (id: FormatId) => void;
  /** Drives the subtle highlight ring on suggested chips. */
  shape?: JsonShape | null;
  /** When reverse, formats without a reverse() implementation are disabled. */
  direction?: Direction;
}

export function FormatPicker({ value, onChange, shape, direction = 'forward' }: FormatPickerProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_FORMATS.map((id) => {
        const c = getConverter(id);
        const active = value === id;
        const suggested = direction === 'forward' && shape ? isFormatSuggested(id, shape) : false;
        const noReverse = direction === 'reverse' && typeof c.reverse !== 'function';
        const enabled = c.meta.ready && !noReverse;
        const dimmed = direction === 'forward' && shape && !suggested && c.meta.ready;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            disabled={!enabled}
            className={cn(
              'group relative inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition',
              active
                ? 'border-primary/60 bg-primary/10 text-foreground'
                : 'border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border',
              !enabled && 'cursor-not-allowed opacity-50',
              dimmed && !active && 'opacity-50',
              suggested && !active && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background',
            )}
            title={
              !c.meta.ready
                ? t('format_status.planned', { phase: c.meta.phase })
                : noReverse
                  ? t('format_status.no_reverse')
                  : suggested
                    ? t('format_status.suggested')
                    : t('format_status.ready')
            }
          >
            <span className="font-mono">{t(c.meta.labelKey)}</span>
            {!c.meta.ready && (
              <span className="border-border text-muted-foreground rounded border px-1 text-[10px] tracking-wide">
                P{c.meta.phase}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
