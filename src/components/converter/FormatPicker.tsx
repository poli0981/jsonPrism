import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ALL_FORMATS, getConverter } from '@/converters/registry';
import type { Direction, FormatId } from '@/converters/types';
import type { JsonShape } from '@/lib/detect';
import { isFormatSuggested } from '@/lib/suggestions';
import { cn } from '@/lib/utils';

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
            className="border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition md:hidden"
          >
            <span className="label-mono">{t('home.format_picker_label')}</span>
            <span className="text-foreground font-mono">{t(current.meta.labelKey)}</span>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
        </SheetTrigger>
        <SheetContent
          closeLabel={t('common.close')}
          side="bottom"
          className="max-h-[80vh] w-full overflow-y-auto"
        >
          <SheetHeader>
            <SheetTitle>{t('home.format_picker_label')}</SheetTitle>
          </SheetHeader>
          <div
            className="grid grid-cols-2 gap-1.5 p-4 pt-2 sm:grid-cols-3"
            role="group"
            aria-label={t('home.format_picker_label')}
          >
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
      <div
        className="hidden flex-wrap gap-1 md:flex"
        role="group"
        aria-label={t('home.format_picker_label')}
      >
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

function chipStatus(noReverse: boolean, suggested: boolean, dimmed: boolean) {
  if (noReverse) return 'no_reverse';
  if (suggested) return 'suggested';
  return dimmed ? 'not_suggested' : 'ready';
}

function FormatChip({ id, value, onChange, shape, direction, expanded }: FormatChipProps) {
  const { t } = useTranslation();
  const c = getConverter(id);
  const active = value === id;
  const suggested = direction === 'forward' && shape ? isFormatSuggested(id, shape) : false;
  const noReverse = direction === 'reverse' && typeof c.reverse !== 'function';
  const enabled = c.meta.ready && !noReverse;
  const dimmed = direction === 'forward' && !!shape && !suggested && c.meta.ready;
  const status = chipStatus(noReverse, suggested, dimmed);

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onChange(id)}
      disabled={!enabled}
      className={cn(
        'group focus-visible:ring-ring relative inline-flex items-center gap-1.5 overflow-hidden rounded-md border font-mono font-medium transition outline-none focus-visible:ring-2',
        expanded ? 'min-h-10 justify-between px-3 text-sm' : 'min-h-7 px-2 text-xs',
        active
          ? 'border-primary/60 bg-primary/10 text-foreground'
          : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:border-foreground/30',
        !enabled && 'cursor-not-allowed opacity-50',
        // Dashed rather than faded, so the label keeps its contrast.
        dimmed && !active && 'border-dashed',
        suggested && !active && 'ring-primary/30 ring-offset-background ring-1 ring-offset-1',
      )}
      title={t(`format_status.${status}`)}
    >
      <span>{t(c.meta.labelKey)}</span>
      {/* Spectrum underline marks the active format. */}
      <span
        aria-hidden
        className={cn(
          'bg-spectrum absolute inset-x-1 bottom-0 h-px origin-left transition-transform duration-300',
          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50',
        )}
      />
    </button>
  );
}
