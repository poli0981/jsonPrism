import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Direction } from '@/converters/types';
import { cn } from '@/lib/utils';

interface DirectionToggleProps {
  value: Direction;
  onChange: (next: Direction) => void;
}

const OPTIONS: Array<{ value: Direction; Icon: typeof ArrowRight }> = [
  { value: 'forward', Icon: ArrowRight },
  { value: 'reverse', Icon: ArrowLeft },
];

export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  const { t } = useTranslation();
  return (
    <div
      className="border-border bg-card/60 inline-flex items-center gap-0.5 rounded-md border p-0.5"
      role="group"
      aria-label={t('direction.title')}
    >
      {OPTIONS.map(({ value: option, Icon }) => {
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option)}
            title={t('direction.hint')}
            className={cn(
              'focus-visible:ring-ring inline-flex min-h-7 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition outline-none focus-visible:ring-2',
              active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {/* Re-keyed on change so the "refract" spin replays each time. */}
            <Icon
              key={active ? `${option}-on` : option}
              className={cn('h-3.5 w-3.5', active && 'text-primary motion-safe:animate-refract')}
              aria-hidden
            />
            <span>{t(`direction.${option}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
