import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n';
import { ChunkErrorBoundary } from '../ChunkErrorBoundary';
import { ChunkErrorFallback } from '../ChunkErrorFallback';
import { ErrorBoundary } from '../ErrorBoundary';
import { clearLogs, recentLogs } from '@/lib/logger';

const CHUNK_ERROR = 'Failed to fetch dynamically imported module: /assets/About-1a2b3c.js';

function Bomb({ message }: { message: string }): never {
  throw new Error(message);
}

function stubReload() {
  const reload = vi.fn();
  vi.stubGlobal('location', { ...window.location, reload });
  return reload;
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

describe('ChunkErrorBoundary', () => {
  it('renders its children when the chunk loads', () => {
    render(
      <ChunkErrorBoundary>
        <p>page</p>
      </ChunkErrorBoundary>,
    );
    expect(screen.getByText('page')).toBeInTheDocument();
  });

  it('shows the reload panel for a failed chunk and logs it', async () => {
    const user = userEvent.setup();
    const reload = stubReload();
    render(
      <ChunkErrorBoundary>
        <Bomb message={CHUNK_ERROR} />
      </ChunkErrorBoundary>,
    );

    expect(
      screen.getByRole('heading', { name: "Couldn't load part of the app" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/usually a new version was just deployed/)).toBeInTheDocument();
    const entry = recentLogs().find((e) => e.scope === 'chunk');
    expect(entry?.message).toContain('Chunk failed to load:');
    expect(entry?.message).toContain('/assets/About-1a2b3c.js');

    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('renders a custom fallback for chunk errors', () => {
    render(
      <ChunkErrorBoundary fallback={<textarea aria-label="Plain editor" />}>
        <Bomb message="Loading chunk 42 failed." />
      </ChunkErrorBoundary>,
    );
    expect(screen.getByRole('textbox', { name: 'Plain editor' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
  });

  it('passes any other error to the outer crash boundary', () => {
    render(
      <ErrorBoundary>
        <ChunkErrorBoundary>
          <Bomb message="Cannot read properties of undefined" />
        </ChunkErrorBoundary>
      </ErrorBoundary>,
    );
    expect(
      screen.getByRole('heading', { name: 'Something refracted unexpectedly.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument();
    expect(recentLogs().some((e) => e.scope === 'chunk')).toBe(false);
  });

  it('still logs a chunk failure when React supplies no component stack', () => {
    new ChunkErrorBoundary({ children: null }).componentDidCatch(new Error(CHUNK_ERROR), {});
    expect(recentLogs(1)[0]).toMatchObject({ scope: 'chunk', level: 'error' });
  });

  it('leaves logging of other errors to the crash boundary', () => {
    const boundary = new ChunkErrorBoundary({ children: null });
    boundary.componentDidCatch(new Error('Cannot read properties of undefined'), {
      componentStack: '\n    at Page',
    });
    expect(recentLogs()).toEqual([]);
  });
});

describe('ChunkErrorFallback', () => {
  it('explains the failure and offers a reload', async () => {
    const user = userEvent.setup();
    const reload = stubReload();
    render(<ChunkErrorFallback />);
    expect(document.title).toBe("Couldn't load part of the app · JSONPrism");
    await user.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
