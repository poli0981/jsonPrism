import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import { ErrorState, errorActionPrimary } from '@/components/common/ErrorState';

/** Default panel shown by ChunkErrorBoundary when a lazy chunk fails to load. */
export function ChunkErrorFallback() {
  const { t } = useTranslation();
  return (
    <ErrorState
      title={t('error_page.chunk.title')}
      message={t('error_page.chunk.message')}
      actions={
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={errorActionPrimary}
        >
          <RotateCw className="h-4 w-4" />
          {t('error_page.actions.reload')}
        </button>
      }
    />
  );
}
