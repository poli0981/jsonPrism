import { useCallback, useSyncExternalStore } from 'react';

function canMatch(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

/**
 * Subscribes to a CSS media query. `fallback` is used where `matchMedia` is
 * unavailable (jsdom, very old webviews).
 */
export function useMediaQuery(query: string, fallback = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!canMatch()) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = () => (canMatch() ? window.matchMedia(query).matches : fallback);
  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}
