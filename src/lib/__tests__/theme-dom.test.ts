import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyTheme,
  isTheme,
  subscribeSystemTheme,
  systemTheme,
  THEME_STORAGE_KEY,
} from '../theme-dom';

const DARK_QUERY = '(prefers-color-scheme: dark)';

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
  const matchMedia = vi.fn((_media: string) => query);
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    query,
    change(dark: boolean) {
      query.matches = dark;
      listeners.forEach((listener) => listener());
    },
  };
}

function addThemeColorMeta(): HTMLMetaElement {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.content = '#000000';
  document.head.appendChild(meta);
  return meta;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove());
  document.documentElement.classList.remove('dark');
  document.documentElement.style.colorScheme = '';
});

describe('isTheme', () => {
  it('accepts exactly the three stored theme values', () => {
    expect(['dark', 'light', 'system'].every(isTheme)).toBe(true);
    for (const value of ['auto', 'Dark', '', null, undefined, 1, {}]) {
      expect(isTheme(value)).toBe(false);
    }
  });
});

describe('systemTheme', () => {
  it('assumes dark when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(systemTheme()).toBe('dark');
  });

  it('follows prefers-color-scheme', () => {
    const media = stubMatchMedia(false);
    expect(systemTheme()).toBe('light');
    expect(media.matchMedia).toHaveBeenCalledWith(DARK_QUERY);
    media.change(true);
    expect(systemTheme()).toBe('dark');
  });
});

describe('subscribeSystemTheme', () => {
  it('returns a harmless unsubscribe when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const onChange = vi.fn();
    const unsubscribe = subscribeSystemTheme(onChange);
    expect(() => unsubscribe()).not.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('notifies on OS theme changes until unsubscribed', () => {
    const media = stubMatchMedia(false);
    const onChange = vi.fn();
    const unsubscribe = subscribeSystemTheme(onChange);
    expect(media.query.addEventListener).toHaveBeenCalledWith('change', onChange);

    media.change(true);
    expect(onChange).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(media.query.removeEventListener).toHaveBeenCalledWith('change', onChange);
    media.change(false);
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('applyTheme', () => {
  it('applies the dark theme to <html>, native controls and the browser chrome', () => {
    const meta = addThemeColorMeta();
    applyTheme('dark');
    const root = document.documentElement;
    expect(root).toHaveClass('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(meta.content).toBe('#0b0c14');
  });

  it('switches back to light', () => {
    const meta = addThemeColorMeta();
    applyTheme('dark');
    applyTheme('light');
    const root = document.documentElement;
    expect(root).not.toHaveClass('dark');
    expect(root.style.colorScheme).toBe('light');
    expect(meta.content).toBe('#fbfbfe');
  });

  it('targets a custom root and tolerates a page without a theme-color meta', () => {
    const root = document.createElement('div');
    expect(() => applyTheme('dark', root)).not.toThrow();
    expect(root).toHaveClass('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('public/theme-init.js', () => {
  it('uses the same storage key and theme colors before first paint', () => {
    const script = readFileSync(
      path.resolve(import.meta.dirname, '../../../public/theme-init.js'),
      'utf8',
    );
    expect(script).toContain(`'${THEME_STORAGE_KEY}'`);

    const meta = addThemeColorMeta();
    for (const theme of ['dark', 'light'] as const) {
      applyTheme(theme, document.createElement('div'));
      expect(script).toContain(`'${meta.content}'`);
    }
  });
});
