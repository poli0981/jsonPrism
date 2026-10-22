/**
 * DOM side of theming, shared by ThemeProvider. Keep the storage key and
 * colors in sync with public/theme-init.js, which applies the same theme
 * before the first paint.
 */

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'jsonprism.theme';
const THEME_COLORS: Record<ResolvedTheme, string> = { dark: '#0b0c14', light: '#fbfbfe' };
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system';
}

function canMatch(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function systemTheme(): ResolvedTheme {
  if (!canMatch()) return 'dark';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** useSyncExternalStore subscription for OS theme changes. */
export function subscribeSystemTheme(onChange: () => void): () => void {
  if (!canMatch()) return () => {};
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

/** Applies a resolved theme to <html>: Tailwind's `.dark`, native control colors, browser chrome. */
export function applyTheme(
  resolved: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLORS[resolved]);
}
