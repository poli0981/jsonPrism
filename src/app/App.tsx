import { lazy, useEffect } from 'react';
import { Route, Routes } from 'react-router';
import { ThemeProvider } from '@/lib/theme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ConsentGate } from '@/components/common/ConsentGate';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { useExternalLinkInterceptor } from '@/hooks/useExternalLinkInterceptor';
import { loadWebAnalytics } from '@/lib/analytics';
import { useConsentStore } from '@/stores/consentStore';
import { usePreferencesStore } from '@/stores/preferencesStore';

// Routes are code-split so the entry chunk stays small and the consent gate +
// app shell paint before any page's heavy graph (editor, parsers) loads.
const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const About = lazy(() => import('@/pages/About').then((m) => ({ default: m.About })));
const NotFound = lazy(() => import('@/pages/errors/NotFound'));
const ErrorRoute = lazy(() => import('@/pages/errors/ErrorRoute'));

/** Cloudflare Web Analytics: production web only, after consent, if the user didn't opt out. */
function useWebAnalytics() {
  const consented = useConsentStore((s) => s.accepted);
  const enabled = usePreferencesStore((s) => s.analytics);
  useEffect(() => {
    loadWebAnalytics({ consented, enabled });
  }, [consented, enabled]);
}

export function App() {
  useExternalLinkInterceptor();
  useWebAnalytics();

  return (
    // The crash boundary is outermost so even a theme/storage failure renders
    // the fallback instead of a blank page.
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system">
        <ConsentGate>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="error/:code" element={<ErrorRoute />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          <Toaster />
        </ConsentGate>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
