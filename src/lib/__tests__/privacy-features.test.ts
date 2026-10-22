import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadWebAnalytics, shouldLoadWebAnalytics, PRODUCTION_HOSTNAME } from '../analytics';
import {
  HUMAN_CHECK_TTL_MS,
  clearHumanCheck,
  isHumanCheckValid,
  loadHumanCheck,
  saveHumanCheck,
} from '../human-check-storage';
import { turnstileLanguage, turnstileSiteKey, verifyToken, TEST_SITE_KEY } from '../turnstile';
import { legalDocUrl } from '../links';

afterEach(() => {
  window.localStorage.clear();
  document.head.querySelectorAll('script[data-cf-beacon]').forEach((s) => s.remove());
});

describe('Web Analytics gating', () => {
  const base = {
    isTauriBuild: false,
    hostname: PRODUCTION_HOSTNAME,
    consented: true,
    enabled: true,
  };

  it('loads only on the production web host, after consent, when enabled', () => {
    expect(shouldLoadWebAnalytics(base)).toBe(true);
    expect(shouldLoadWebAnalytics({ ...base, isTauriBuild: true })).toBe(false);
    expect(shouldLoadWebAnalytics({ ...base, hostname: 'localhost' })).toBe(false);
    expect(shouldLoadWebAnalytics({ ...base, consented: false })).toBe(false);
    expect(shouldLoadWebAnalytics({ ...base, enabled: false })).toBe(false);
  });

  it('never injects the beacon outside production (jsdom runs on localhost)', () => {
    expect(loadWebAnalytics({ consented: true, enabled: true })).toBe(false);
    expect(document.querySelector('script[data-cf-beacon]')).toBeNull();
  });
});

describe('human-check storage', () => {
  it('round-trips and expires', () => {
    const now = 1_000_000;
    saveHumanCheck(now + 1000);
    expect(isHumanCheckValid(loadHumanCheck(), now)).toBe(true);
    expect(isHumanCheckValid(loadHumanCheck(), now + 2000)).toBe(false);
    clearHumanCheck();
    expect(loadHumanCheck()).toBeNull();
  });

  it('rejects malformed or implausible data', () => {
    window.localStorage.setItem('jsonprism.humanCheck', '{"verifiedUntil":"soon"}');
    expect(loadHumanCheck()).toBeNull();
    const now = Date.now();
    expect(isHumanCheckValid({ verifiedUntil: now + HUMAN_CHECK_TTL_MS * 10 }, now)).toBe(false);
  });
});

describe('Turnstile client helpers', () => {
  it('uses the always-pass test key on localhost', () => {
    expect(turnstileSiteKey('localhost')).toBe(TEST_SITE_KEY);
    expect(turnstileSiteKey('jsonprism.poli0981.dev')).not.toBe(TEST_SITE_KEY);
  });

  it('maps app languages to widget languages', () => {
    expect(turnstileLanguage('zh-CN')).toBe('zh-cn');
    expect(turnstileLanguage('vi')).toBe('vi');
    expect(turnstileLanguage(undefined)).toBe('en');
  });

  it('distinguishes verified, rejected and unavailable', async () => {
    const respond = (status: number, body: unknown) =>
      vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
    expect(await verifyToken('t', respond(200, { ok: true, verifiedUntil: 5 }))).toEqual({
      status: 'verified',
      verifiedUntil: 5,
    });
    expect((await verifyToken('t', respond(403, { ok: false }))).status).toBe('rejected');
    expect((await verifyToken('t', respond(503, { ok: false }))).status).toBe('unavailable');
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));
    expect((await verifyToken('t', offline)).status).toBe('unavailable');
  });
});

describe('legalDocUrl', () => {
  it('pins documents to the build commit, falling back to main', () => {
    expect(legalDocUrl('PRIVACY.md', 'abc1234')).toBe(
      'https://github.com/poli0981/jsonPrism/blob/abc1234/PRIVACY.md',
    );
    expect(legalDocUrl('TERMS.md', 'dev')).toBe(
      'https://github.com/poli0981/jsonPrism/blob/main/TERMS.md',
    );
  });
});
