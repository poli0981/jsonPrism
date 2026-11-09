import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ChunkErrorBoundary } from '@/components/common/ChunkErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { RouteFallback } from '@/components/common/RouteFallback';
import { focusMain, MAIN_ID } from '@/lib/focus';
import { SITE_URL } from '@/lib/links';
import { Header } from './Header';
import { Footer } from './Footer';

/** `pathname` without trailing slashes; a loop, because `/\/+$/` backtracks on long runs. */
function trimTrailingSlashes(pathname: string): string {
  let end = pathname.length;
  while (end > 0 && pathname.charCodeAt(end - 1) === 47) end--;
  return pathname.slice(0, end);
}

/** Points canonical / og:url at the production URL of the current route. */
function useCanonicalUrl(pathname: string) {
  useEffect(() => {
    const url = `${SITE_URL}${pathname === '/' ? '/' : trimTrailingSlashes(pathname)}`;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
  }, [pathname]);
}

/**
 * After an in-app navigation, moves focus to `<main>` so keyboard and
 * screen-reader users continue in the new page instead of on the link they
 * left behind. The first render keeps the browser's default focus.
 */
function useFocusMainOnNavigate(pathname: string) {
  const previous = useRef(pathname);
  useEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    focusMain({ preventScroll: true });
  }, [pathname]);
}

export function Layout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  useCanonicalUrl(pathname);
  useFocusMainOnNavigate(pathname);

  return (
    <div className="flex h-dvh flex-col">
      {/* First tab stop. Focuses <main> directly, so the URL gets no #hash
          and the router never sees a navigation. */}
      <a
        href={`#${MAIN_ID}`}
        onClick={(e) => {
          e.preventDefault();
          focusMain();
        }}
        // `not-sr-only` resets padding, so the focused padding is set after it.
        className="bg-background text-foreground border-border sr-only z-50 rounded-md border text-sm font-medium shadow-lg focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:px-3 focus:py-2"
      >
        {t('nav.skip_to_content')}
      </a>
      <Header />
      <OfflineBanner />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] outline-none"
      >
        {/* Boundary catches a failed route chunk (e.g. stale deploy) and keeps
            the header/footer; keyed by path so navigating away recovers.
            Suspense shows the loader while the chunk streams in. */}
        <ChunkErrorBoundary key={pathname}>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </ChunkErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
