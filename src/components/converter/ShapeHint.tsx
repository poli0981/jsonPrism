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
    <div className="text-muted-foreground inline-flex items-center gap-1.5 font-mono text-xs">
      <Sparkles className="text-primary h-3 w-3" />
      <span>{t('shape.detected')}:</span>
      <span className="text-foreground">{t(`shape.${shape}`)}</span>
    </div>
  );
}
