import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { House } from 'lucide-react';
import { ErrorState, errorActionPrimary } from '@/components/common/ErrorState';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <ErrorState
      code={404}
      title={t('error_page.404.title')}
      message={t('error_page.404.message')}
      actions={
        <Link to="/" className={errorActionPrimary}>
          <House className="h-4 w-4" />
          {t('error_page.actions.home')}
        </Link>
      }
    />
  );
}
