import { create } from 'zustand';
import { safeGetJson, safeSetItem } from '@/lib/safe-storage';

/**
 * App-wide display and privacy preferences (not per-format converter options).
 * `public/theme-init.js` reads the same key before first paint so the page
 * never flashes scrollbars that the user has hidden.
 */

export const PREFERENCES_KEY = 'jsonprism.prefs';
const PREFERENCES_VERSION = 1;

export interface Preferences {
  /** Hide scrollbars everywhere; content stays scrollable by wheel, touch and keyboard. */
  hideScrollbars: boolean;
  /**
   * Anonymous Cloudflare Web Analytics on the web build. On by default unless
   * the browser sends Global Privacy Control; users can object at any time.
   */
  analytics: boolean;
}

interface PreferencesState extends Preferences {
  setHideScrollbars(hide: boolean): void;
  setAnalytics(enabled: boolean): void;
}

function sendsGlobalPrivacyControl(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
  );
}

function load(): Preferences {
  const stored = safeGetJson(PREFERENCES_KEY);
  const values =
    stored !== null && typeof stored === 'object' ? (stored as Partial<Preferences>) : {};
  return {
    hideScrollbars: typeof values.hideScrollbars === 'boolean' ? values.hideScrollbars : false,
    analytics:
      typeof values.analytics === 'boolean' ? values.analytics : !sendsGlobalPrivacyControl(),
  };
}

function persist(prefs: Preferences): void {
  safeSetItem(PREFERENCES_KEY, JSON.stringify({ v: PREFERENCES_VERSION, ...prefs }));
}

/** Mirrors display preferences onto <html> so plain CSS can react to them. */
export function applyPreferences(
  prefs: Pick<Preferences, 'hideScrollbars'>,
  root: HTMLElement = document.documentElement,
): void {
  if (prefs.hideScrollbars) root.dataset['scrollbars'] = 'hidden';
  else delete root.dataset['scrollbars'];
}

export const usePreferencesStore = create<PreferencesState>((set, get) => {
  const update = (patch: Partial<Preferences>) => {
    set(patch);
    const { hideScrollbars, analytics } = get();
    persist({ hideScrollbars, analytics });
  };
  return {
    ...load(),
    setHideScrollbars: (hide) => {
      update({ hideScrollbars: hide });
      if (typeof document !== 'undefined') applyPreferences({ hideScrollbars: hide });
    },
    setAnalytics: (enabled) => update({ analytics: enabled }),
  };
});
