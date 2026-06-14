import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { House, RotateCw } from 'lucide-react';
import {
  ErrorState,
  errorActionPrimary,
  errorActionSecondary,
} from '@/components/common/ErrorState';

// Codes that get dedicated copy. JSONPrism is a static client-side SPA, so it
// never emits these from a server itself — this route exists so any code (e.g.
// surfaced from a future backend or a Tauri IPC failure) can render a polished,
// consistent page. Unknown codes fall back to generic copy but still show the
// number.
const DEDICATED = new Set(['403', '404', '419', '500']);

export default function ErrorRoute() {
  const { t } = useTranslation();
  const { code } = useParams<{ code: string }>();
  const dedicated = code !== undefined && DEDICATED.has(code);

  return (
    <ErrorState
      code={code ?? '?'}
      title={t(dedicated ? `error_page.${code}.title` : 'error_page.generic.title')}
      message={t(dedicated ? `error_page.${code}.message` : 'error_page.generic.message')}
      actions={
        <>
          <Link to="/" className={errorActionPrimary}>
            <House className="h-4 w-4" />
            {t('error_page.actions.home')}
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={errorActionSecondary}
          >
            <RotateCw className="h-4 w-4" />
            {t('error_page.actions.reload')}
          </button>
        </>
      }
    />
  );
}
