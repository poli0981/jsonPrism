import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import '@/i18n';
import { App } from '../App';
import { loadWebAnalytics } from '@/lib/analytics';
import { useConsentStore } from '@/stores/consentStore';
import { usePreferencesStore } from '@/stores/preferencesStore';

const home = vi.hoisted(() => ({ crash: false }));

vi.mock('@/lib/analytics', () => ({ loadWebAnalytics: vi.fn(() => false) }));

// The real workspace pulls in the editor and every parser; the routing and
// app-shell wiring are what's under test here.
vi.mock('@/pages/Home', () => ({
  Home: () => {
    if (home.crash) throw new Error('Workspace exploded');
    return <h1>Converter workspace</h1>;
  },
}));

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  home.crash = false;
  useConsentStore.setState({ accepted: true, humanVerified: true });
  usePreferencesStore.setState({ hideScrollbars: false, analytics: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.classList.remove('dark');
});

describe('App', () => {
  it.each([
    ['/', 'Converter workspace'],
    ['/about', 'About JSONPrism'],
    ['/error/403', 'Forbidden'],
    ['/no/such/page', 'Page not found'],
  ])('renders %s inside the app shell', async (path, heading) => {
    renderApp(path);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('mounts the translated toast region', async () => {
    renderApp('/');
    await screen.findByRole('heading', { name: 'Converter workspace' });
    expect(screen.getByRole('region', { name: /^Notifications/ })).toBeInTheDocument();
  });

  it('puts the consent gate in front of the app on first launch', async () => {
    useConsentStore.setState({ accepted: false });
    renderApp('/');
    expect(await screen.findByRole('dialog', { name: 'Before you start' })).toBeInTheDocument();
    // The shell renders behind the modal but is hidden from assistive tech.
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('loads analytics only after consent and re-checks when the opt-out changes', async () => {
    useConsentStore.setState({ accepted: false });
    renderApp('/');
    await screen.findByRole('dialog');
    expect(loadWebAnalytics).toHaveBeenLastCalledWith({ consented: false, enabled: true });

    act(() => useConsentStore.getState().accept());
    expect(loadWebAnalytics).toHaveBeenLastCalledWith({ consented: true, enabled: true });

    act(() => usePreferencesStore.getState().setAnalytics(false));
    expect(loadWebAnalytics).toHaveBeenLastCalledWith({ consented: true, enabled: false });
  });

  it('falls back to the crash screen when a page fails for reasons other than loading', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    home.crash = true;
    renderApp('/');
    expect(
      await screen.findByRole('heading', { name: 'Something refracted unexpectedly.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Workspace exploded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });
});
