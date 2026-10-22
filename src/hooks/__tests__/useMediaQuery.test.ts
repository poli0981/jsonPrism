import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

type Listener = (event: MediaQueryListEvent) => void;

/** A controllable `matchMedia`: flip `matches` per query and fire 'change'. */
function installMatchMedia(initial: Record<string, boolean>) {
  const state = { ...initial };
  const listeners = new Map<string, Set<Listener>>();
  const matchMedia = vi.fn((query: string) => ({
    get matches() {
      return state[query] ?? false;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: 'change', cb: Listener) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(cb);
    },
    removeEventListener: (_type: 'change', cb: Listener) => {
      listeners.get(query)?.delete(cb);
    },
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  vi.stubGlobal('matchMedia', matchMedia);
  return {
    matchMedia,
    set(query: string, matches: boolean) {
      state[query] = matches;
      for (const cb of listeners.get(query) ?? [])
        cb({ matches, media: query } as MediaQueryListEvent);
    },
    listenerCount: (query: string) => listeners.get(query)?.size ?? 0,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  it('returns the fallback where matchMedia is unavailable', () => {
    // jsdom ships without matchMedia.
    expect(window.matchMedia).toBeUndefined();
    expect(renderHook(() => useMediaQuery('(min-width: 768px)')).result.current).toBe(false);
    expect(renderHook(() => useMediaQuery('(min-width: 768px)', true)).result.current).toBe(true);
  });

  it('reports the current match and follows changes', () => {
    const mq = installMatchMedia({ '(min-width: 768px)': true });
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);

    act(() => mq.set('(min-width: 768px)', false));
    expect(result.current).toBe(false);

    act(() => mq.set('(min-width: 768px)', true));
    expect(result.current).toBe(true);
  });

  it('prefers the real match over the fallback', () => {
    installMatchMedia({ '(min-width: 768px)': false });
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)', true));
    expect(result.current).toBe(false);
  });

  it('re-subscribes when the query changes and cleans up on unmount', () => {
    const mq = installMatchMedia({ '(min-width: 768px)': true, '(min-width: 1024px)': false });
    const { result, rerender, unmount } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(min-width: 768px)' },
    });
    expect(result.current).toBe(true);
    expect(mq.listenerCount('(min-width: 768px)')).toBe(1);

    rerender({ query: '(min-width: 1024px)' });
    expect(result.current).toBe(false);
    expect(mq.listenerCount('(min-width: 768px)')).toBe(0);
    expect(mq.listenerCount('(min-width: 1024px)')).toBe(1);

    unmount();
    expect(mq.listenerCount('(min-width: 1024px)')).toBe(0);
  });

  it('uses the fallback for the hydration pass, then the live value', () => {
    installMatchMedia({ '(min-width: 768px)': false });
    const seen: boolean[] = [];
    renderHook(
      () => {
        const value = useMediaQuery('(min-width: 768px)', true);
        seen.push(value);
        return value;
      },
      { hydrate: true },
    );
    expect(seen[0]).toBe(true);
    expect(seen.at(-1)).toBe(false);
  });
});
