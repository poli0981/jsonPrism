import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { lazy, type ComponentType } from 'react';
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router';
import '@/i18n';
import { Layout } from '../Layout';
import { SITE_URL } from '@/lib/links';
import { ThemeProvider } from '@/lib/theme';

function ChunkBomb(): never {
  throw new Error('Failed to fetch dynamically imported module: /assets/About-1a2b3c.js');
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function renderAt(path: string, extraRoutes: RouteObject[] = []) {
  const router = createMemoryRouter(
    [
      {
        element: <Layout />,
        children: [
          { index: true, element: <p>converter page</p> },
          { path: 'about', element: <p>about page</p> },
          { path: 'broken', element: <ChunkBomb /> },
          ...extraRoutes,
        ],
      },
    ],
    { initialEntries: [path] },
  );
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  );
  return { router, user };
}

function addHeadTag<K extends 'link' | 'meta'>(tag: K, attrs: Record<string, string>) {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.head.appendChild(el);
  return el;
}

afterEach(() => {
  document.head
    .querySelectorAll('link[rel="canonical"], meta[property="og:url"]')
    .forEach((el) => el.remove());
  document.documentElement.classList.remove('dark');
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.restoreAllMocks();
});

describe('Layout', () => {
  it('frames every route with the header, main landmark and footer', () => {
    // No canonical tags in this document: the layout must not depend on them.
    renderAt('/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getByText('converter page')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('points canonical and og:url at the production URL of the current route', async () => {
    const canonical = addHeadTag('link', { rel: 'canonical', href: `${SITE_URL}/` });
    const ogUrl = addHeadTag('meta', { property: 'og:url', content: `${SITE_URL}/` });
    const { router } = renderAt('/about/');
    expect(screen.getByText('about page')).toBeInTheDocument();
    expect(canonical).toHaveAttribute('href', `${SITE_URL}/about`);
    expect(ogUrl).toHaveAttribute('content', `${SITE_URL}/about`);

    await act(() => router.navigate('/'));
    expect(canonical).toHaveAttribute('href', `${SITE_URL}/`);
    expect(ogUrl).toHaveAttribute('content', `${SITE_URL}/`);
  });

  it('shows the route loader while a page chunk streams in', async () => {
    const page = deferred<{ default: ComponentType }>();
    const SlowPage = lazy(() => page.promise);
    renderAt('/slow', [{ path: 'slow', element: <SlowPage /> }]);
    expect(within(screen.getByRole('main')).getByText('Loading…')).toBeInTheDocument();

    await act(async () => {
      page.resolve({ default: () => <p>slow page</p> });
      await page.promise;
    });
    expect(await screen.findByText('slow page')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('keeps the shell when a page chunk fails and recovers on navigation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user } = renderAt('/broken');
    const failure = { name: "Couldn't load part of the app" };
    expect(within(screen.getByRole('main')).getByRole('heading', failure)).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Convert' }));
    expect(screen.getByText('converter page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', failure)).not.toBeInTheDocument();
  });

  it('shows the offline notice above the page', () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    renderAt('/');
    expect(screen.getByRole('status')).toHaveTextContent(/You're offline/);
    expect(screen.getByText('converter page')).toBeInTheDocument();
  });
});
