import { beforeEach, describe, expect, it } from 'vitest';
import { applyPreferences, PREFERENCES_KEY, usePreferencesStore } from '../preferencesStore';

beforeEach(() => {
  window.localStorage.clear();
  usePreferencesStore.setState({ hideScrollbars: false, analytics: true });
  delete document.documentElement.dataset['scrollbars'];
});

describe('preferencesStore', () => {
  it('hides scrollbars via a data attribute on <html> and persists the choice', () => {
    usePreferencesStore.getState().setHideScrollbars(true);
    expect(document.documentElement.dataset['scrollbars']).toBe('hidden');
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) as string)).toMatchObject({
      v: 1,
      hideScrollbars: true,
    });
    usePreferencesStore.getState().setHideScrollbars(false);
    expect(document.documentElement.dataset['scrollbars']).toBeUndefined();
  });

  it('persists the analytics opt-out', () => {
    usePreferencesStore.getState().setAnalytics(false);
    expect(usePreferencesStore.getState().analytics).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) as string)).toMatchObject({
      analytics: false,
    });
  });

  it('applyPreferences mirrors the flag onto any root element', () => {
    const root = document.createElement('div');
    applyPreferences({ hideScrollbars: true }, root);
    expect(root.dataset['scrollbars']).toBe('hidden');
  });
});
