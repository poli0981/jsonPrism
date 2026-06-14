import { useEffect, useState } from 'react';

/**
 * Tracks browser connectivity via `navigator.onLine` + the `online`/`offline`
 * events. JSONPrism runs fully client-side, so this is informational only
 * (the app keeps working offline — only web fonts need the network).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
