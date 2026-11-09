import { useTranslation } from 'react-i18next';
import { LoaderCircle } from 'lucide-react';

/** Suspense fallback shown while a lazily-loaded route chunk is fetched. */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center gap-2 p-8"
    >
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
      <span className="text-sm">{t('common.loading')}</span>
    </div>
  );
}
