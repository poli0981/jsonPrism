import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Non-blocking strip shown when the browser goes offline. Deliberately not a
 * route — going offline must never interrupt a conversion in progress.
 */
export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="border-border/60 bg-card flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs"
      style={{ color: 'var(--color-prism-amber)' }}
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>{t('error_page.offline.message')}</span>
    </div>
  );
}
