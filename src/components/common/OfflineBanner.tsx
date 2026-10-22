import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Non-blocking strip shown when the browser goes offline. Deliberately not a
 * route — going offline must never interrupt a conversion in progress. Not
 * shown in the desktop/Android apps, where offline is the normal state.
 */
export function OfflineBanner() {
  if (__IS_TAURI_BUILD__) return null;
  return <WebOfflineBanner />;
}

function WebOfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="border-border/70 bg-card text-warning flex items-center justify-center gap-2 border-b px-4 py-1.5 text-xs"
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      <span>{t('error_page.offline.message')}</span>
    </div>
  );
}
