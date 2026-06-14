import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ChunkErrorBoundary } from '@/components/common/ChunkErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { RouteFallback } from '@/components/common/RouteFallback';
import { Header } from './Header';
import { Footer } from './Footer';

export function Layout() {
  return (
    <div className="flex h-dvh flex-col">
      <Header />
      <OfflineBanner />
      <main className="flex min-h-0 flex-1 flex-col">
        {/* Boundary catches a failed route chunk (e.g. stale deploy) and keeps
            the header/footer; Suspense shows the loader while it streams in. */}
        <ChunkErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </ChunkErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}
