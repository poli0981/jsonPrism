import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ConsentGate } from '@/components/common/ConsentGate';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';

// Routes are code-split so the entry chunk stays small and the consent gate +
// app shell paint before any page's heavy graph (editor, parsers) loads.
const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const About = lazy(() => import('@/pages/About').then((m) => ({ default: m.About })));
const NotFound = lazy(() => import('@/pages/errors/NotFound'));
const ErrorRoute = lazy(() => import('@/pages/errors/ErrorRoute'));

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <ErrorBoundary>
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
      </ErrorBoundary>
    </ThemeProvider>
  );
}
