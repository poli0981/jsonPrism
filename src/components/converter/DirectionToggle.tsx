import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Direction = 'forward' | 'reverse';

interface DirectionToggleProps {
  value: Direction;
  onChange: (next: Direction) => void;
}

export function DirectionToggle({ value, onChange }: DirectionToggleProps) {
  const { t } = useTranslation();
  return (
    <div
      className="border-border/60 inline-flex items-center gap-0.5 rounded-md border p-0.5"
      role="group"
      aria-label={t('direction.title')}
    >
      <button
        type="button"
        onClick={() => onChange('forward')}
        title={t('direction.hint')}
        className={cn(
          'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition',
          value === 'forward'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <ArrowRight className="h-3 w-3" />
        <span>{t('direction.forward')}</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('reverse')}
        title={t('direction.hint')}
        className={cn(
          'inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition',
          value === 'reverse'
            ? 'bg-muted text-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <ArrowLeft className="h-3 w-3" />
        <span>{t('direction.reverse')}</span>
      </button>
    </div>
  );
}
