import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const current = getConverter(value);

  const handlePick = (id: FormatId) => {
    onChange(id);
    setSheetOpen(false);
  };

  return (
    <>
      {/* Mobile: compact Sheet trigger — saves ~50-80px of toolbar height when
          the 12 chip grid would otherwise wrap to 2-3 rows on narrow viewports. */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="border-border bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition md:hidden"
            aria-label={t('home.format_picker_label')}
          >
            <span className="tracking-wider uppercase opacity-70">
              {t('home.format_picker_label')}
            </span>
            <span className="text-foreground font-mono">{t(current.meta.labelKey)}</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('home.format_picker_label')}</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-1.5 p-4 pt-2 sm:grid-cols-3">
            {ALL_FORMATS.map((id) => (
              <FormatChip
                key={id}
                id={id}
                value={value}
                onChange={handlePick}
                shape={shape}
                direction={direction}
                expanded
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop: 12 chips inline. */}
      <div className="hidden flex-wrap gap-1.5 md:flex">
        {ALL_FORMATS.map((id) => (
          <FormatChip
            key={id}
            id={id}
            value={value}
            onChange={onChange}
            shape={shape}
            direction={direction}
          />
        ))}
      </div>
    </>
  );
}

interface FormatChipProps {
  id: FormatId;
  value: FormatId;
  onChange: (id: FormatId) => void;
  shape: JsonShape | null | undefined;
  direction: Direction;
  /** Expanded layout (fills the Sheet grid cell), vs the compact inline chip. */
  expanded?: boolean;
}

function FormatChip({ id, value, onChange, shape, direction, expanded }: FormatChipProps) {
  const { t } = useTranslation();
  const c = getConverter(id);
  const active = value === id;
  const suggested = direction === 'forward' && shape ? isFormatSuggested(id, shape) : false;
  const noReverse = direction === 'reverse' && typeof c.reverse !== 'function';
  const enabled = c.meta.ready && !noReverse;
  const dimmed = direction === 'forward' && shape && !suggested && c.meta.ready;

  return (
    <button
      type="button"
      onClick={() => onChange(id)}
      disabled={!enabled}
      className={cn(
        'group relative inline-flex items-center gap-1.5 rounded-md border font-medium transition',
        expanded
          ? 'justify-between px-3 py-2 text-sm'
          : 'px-2 py-0.5 text-[11px] sm:px-2.5 sm:py-1 sm:text-xs',
        active
          ? 'border-primary/60 bg-primary/10 text-foreground'
          : 'border-border bg-card/40 text-muted-foreground hover:text-foreground hover:border-border',
        !enabled && 'cursor-not-allowed opacity-50',
        dimmed && !active && 'opacity-50',
        suggested && !active && 'ring-primary/30 ring-offset-background ring-1 ring-offset-1',
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
}
