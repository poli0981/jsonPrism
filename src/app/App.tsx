import { Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/lib/theme';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { Home } from '@/pages/Home';
import { About } from '@/pages/About';

export function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <ErrorBoundary>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
        <Toaster />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
