import { useEffect } from 'react';
import { isTauri, openExternal } from '@/lib/tauri';

/**
 * Route external-link clicks to the system browser inside Tauri.
 *
 * Tauri webviews (notably Android) silently ignore `target="_blank"`, so a
 * tapped `<a href="https://…">` does nothing. A single delegated listener
 * catches every external anchor app-wide and hands the URL to the OS browser
 * via the shell plugin. No-op on the web build (browsers open new tabs
 * natively) and for in-app router links (relative hrefs don't match).
 */
export function useExternalLinkInterceptor(): void {
  useEffect(() => {
    if (!isTauri()) return;

    const handler = (e: MouseEvent) => {
      if (e.button !== 0 || e.defaultPrevented) return;
      const anchor = (e.target as Element | null)?.closest('a');
      if (!anchor) return;
      // Raw attribute, NOT `anchor.href`: the property absolutises relative
      // router links ("/about" → "http://…/about") and would match.
      const href = anchor.getAttribute('href');
      if (!href || !/^https?:\/\//i.test(href)) return;
      e.preventDefault();
      void openExternal(href);
    };

    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
}
