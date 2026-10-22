import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '../theme';
import { THEME_STORAGE_KEY } from '../theme-dom';

/** Minimal MediaQueryList stand-in — jsdom ships without matchMedia. */
function stubMatchMedia(prefersDark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: prefersDark,
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.delete(listener);
    }),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query),
  );
  return {
    query,
    change(dark: boolean) {
      query.matches = dark;
      listeners.forEach((listener) => listener());
    },
  };
}

function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      {(['light', 'dark', 'system'] as const).map((value) => (
        <button key={value} type="button" onClick={() => setTheme(value)}>
          {value}
        </button>
      ))}
    </div>
  );
}

const html = () => document.documentElement;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  html().classList.remove('dark');
  html().style.colorScheme = '';
});

describe('ThemeProvider', () => {
  it('defaults to the system theme and follows OS changes live', () => {
    const media = stubMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(html()).not.toHaveClass('dark');
    expect(html().style.colorScheme).toBe('light');

    act(() => media.change(true));
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(html()).toHaveClass('dark');
  });

  it('restores a stored theme over the default', () => {
    stubMatchMedia(true);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(html()).not.toHaveClass('dark');
  });

  it('ignores an unknown stored value and uses the default theme', () => {
    stubMatchMedia(false);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    render(
      <ThemeProvider defaultTheme="dark">
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(html()).toHaveClass('dark');
  });

  it('persists a chosen theme and applies it to the page and browser chrome', async () => {
    const user = userEvent.setup();
    stubMatchMedia(false);
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'dark' }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(html()).toHaveClass('dark');
    expect(meta.content).toBe('#0b0c14');

    await user.click(screen.getByRole('button', { name: 'system' }));
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(html()).not.toHaveClass('dark');
    expect(meta.content).toBe('#fbfbfe');
  });

  it('keeps working when site storage is blocked', async () => {
    const user = userEvent.setup();
    stubMatchMedia(false);
    const denied = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem: denied, setItem: denied, removeItem: denied } as unknown as Storage,
    });
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    await user.click(screen.getByRole('button', { name: 'dark' }));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(html()).toHaveClass('dark');
  });

  it('falls back to dark when the OS preference cannot be read', () => {
    vi.stubGlobal('matchMedia', undefined);
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(html()).toHaveClass('dark');
  });

  it('stops listening to the OS preference on unmount', () => {
    const media = stubMatchMedia(false);
    const { unmount } = render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(media.query.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    unmount();
    expect(media.query.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});

describe('useTheme', () => {
  it('throws a helpful error outside <ThemeProvider>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used inside <ThemeProvider>',
    );
  });
});
