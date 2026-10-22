import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ChunkErrorBoundary } from '@/components/common/ChunkErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { RouteFallback } from '@/components/common/RouteFallback';
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

export function Layout() {
  const { pathname } = useLocation();
  useCanonicalUrl(pathname);

  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <OfflineBanner />
      <main className="flex min-h-0 flex-1 flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
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
