import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadWebAnalytics, PRODUCTION_HOSTNAME } from '../analytics';

const BEACON = 'script[data-cf-beacon]';

/**
 * A fresh document that reports the given hostname (jsdom itself runs on
 * localhost, and `document.location` is unforgeable, hence the proxy).
 * `null` returns the plain detached document, whose `location` is null.
 */
function documentAt(hostname: string | null): Document {
  const doc = document.implementation.createHTMLDocument('analytics');
  if (hostname === null) return doc;
  return new Proxy(doc, {
    get(target, prop) {
      if (prop === 'location') return { hostname };
      const value: unknown = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

describe('loadWebAnalytics', () => {
  it('injects the cookieless beacon on the production site after consent', () => {
    const doc = documentAt(PRODUCTION_HOSTNAME);
    expect(loadWebAnalytics({ consented: true, enabled: true }, doc)).toBe(true);

    const scripts = doc.head.querySelectorAll<HTMLScriptElement>(BEACON);
    expect(scripts).toHaveLength(1);
    const [script] = scripts;
    expect(script?.type).toBe('module');
    expect(script?.src).toBe('https://static.cloudflareinsights.com/beacon.min.js');
    expect(JSON.parse(script?.getAttribute('data-cf-beacon') ?? '{}')).toEqual({
      token: expect.stringMatching(/^[0-9a-f]{32}$/),
    });
  });

  it('is idempotent', () => {
    const doc = documentAt(PRODUCTION_HOSTNAME);
    loadWebAnalytics({ consented: true, enabled: true }, doc);
    expect(loadWebAnalytics({ consented: true, enabled: true }, doc)).toBe(true);
    expect(doc.querySelectorAll(BEACON)).toHaveLength(1);
  });

  it('stays off without consent or after the user opts out', () => {
    const doc = documentAt(PRODUCTION_HOSTNAME);
    expect(loadWebAnalytics({ consented: false, enabled: true }, doc)).toBe(false);
    expect(loadWebAnalytics({ consented: true, enabled: false }, doc)).toBe(false);
    expect(doc.querySelector(BEACON)).toBeNull();
  });

  it('stays off on other hosts and on documents without a location', () => {
    const preview = documentAt('jsonprism.workers.dev');
    expect(loadWebAnalytics({ consented: true, enabled: true }, preview)).toBe(false);
    expect(preview.querySelector(BEACON)).toBeNull();

    const detached = documentAt(null);
    expect(detached.location).toBeNull();
    expect(loadWebAnalytics({ consented: true, enabled: true }, detached)).toBe(false);
    expect(detached.querySelector(BEACON)).toBeNull();
  });

  describe('in Tauri builds', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('never injects the beacon, even on the production host', () => {
      vi.stubGlobal('__IS_TAURI_BUILD__', true);
      const doc = documentAt(PRODUCTION_HOSTNAME);
      expect(loadWebAnalytics({ consented: true, enabled: true }, doc)).toBe(false);
      expect(doc.querySelector(BEACON)).toBeNull();
    });
  });
});
