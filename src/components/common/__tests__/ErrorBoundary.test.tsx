import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';
import { clearLogs, recentLogs } from '@/lib/logger';

function Bomb({ error }: { error: unknown }): never {
  throw error;
}

beforeEach(() => {
  // React and the logger both report caught render errors to the console.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  clearLogs();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('replaces a crashed tree with the crash screen and logs the error', () => {
    render(
      <ErrorBoundary>
        <Bomb error={new Error('kaboom')} />
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole('heading', { name: 'Something refracted unexpectedly.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    expect(document.title).toBe('Something refracted unexpectedly. · JSONPrism');

    const entry = recentLogs().find((e) => e.scope === 'error-boundary');
    expect(entry).toMatchObject({ level: 'error' });
    expect(entry?.message).toContain('kaboom');
  });

  it('shows a generic message when something other than an Error is thrown', () => {
    render(
      <ErrorBoundary>
        <Bomb error="not an Error" />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Unknown error.')).toBeInTheDocument();
  });

  it('renders a custom fallback instead of the crash screen', () => {
    render(
      <ErrorBoundary fallback={<p>custom fallback</p>}>
        <Bomb error={new Error('kaboom')} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('custom fallback')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });

  it('reloads the page from the crash screen', async () => {
    const user = userEvent.setup();
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    render(
      <ErrorBoundary>
        <Bomb error={new Error('kaboom')} />
      </ErrorBoundary>,
    );
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('still logs when React supplies no component stack', () => {
    new ErrorBoundary({ children: null }).componentDidCatch(new Error('bare'), {});
    expect(recentLogs(1)[0]).toMatchObject({ scope: 'error-boundary', level: 'error' });
    expect(recentLogs(1)[0]?.message).toContain('bare');
  });
});
