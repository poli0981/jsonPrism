import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import type { JsonShape } from '@/lib/detect';

interface ShapeHintProps {
  shape: JsonShape | null;
}

export function ShapeHint({ shape }: ShapeHintProps) {
  const { t } = useTranslation();
  if (!shape || shape === 'unknown') return null;

  return (
    <div className="text-muted-foreground hidden items-center gap-1.5 font-mono text-xs lg:inline-flex">
      <Sparkles className="text-primary motion-safe:animate-pop h-3.5 w-3.5" aria-hidden />
      <span>{t('shape.detected_value', { shape: t(`shape.${shape}`) })}</span>
    </div>
  );
}
