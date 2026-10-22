import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_VERSION, saveConsent } from '@/lib/consent-storage';
import { HUMAN_CHECK_TTL_MS, saveHumanCheck } from '@/lib/human-check-storage';

// Turnstile is off under `vitest` (not a production build); control it here.
const turnstile = vi.hoisted(() => ({ enabled: true }));
vi.mock('@/lib/turnstile', () => ({ isTurnstileEnabled: () => turnstile.enabled }));

/** The store reads storage once, at module load — import a fresh copy per scenario. */
async function loadStore() {
  vi.resetModules();
  const { useConsentStore } = await import('../consentStore');
  return useConsentStore;
}

beforeEach(() => {
  turnstile.enabled = true;
});

describe('consentStore initial state', () => {
  it('requires a human check on the web when none is stored', async () => {
    const store = await loadStore();
    expect(store.getState()).toMatchObject({ accepted: false, humanVerified: false });
  });

  it('trusts a stored, unexpired human check', async () => {
    saveHumanCheck(Date.now() + 60_000);
    const store = await loadStore();
    expect(store.getState().humanVerified).toBe(true);
  });

  it('asks again once the stored check has expired or looks tampered with', async () => {
    saveHumanCheck(Date.now() - 1);
    expect((await loadStore()).getState().humanVerified).toBe(false);

    saveHumanCheck(Date.now() + HUMAN_CHECK_TTL_MS * 3);
    expect((await loadStore()).getState().humanVerified).toBe(false);
  });

  it('skips the human check where Turnstile is off', async () => {
    turnstile.enabled = false;
    const store = await loadStore();
    expect(store.getState().humanVerified).toBe(true);
  });

  it('restores consent given for the current terms version', async () => {
    saveConsent({ accepted: true, version: CONSENT_VERSION, acceptedAt: 1 });
    const store = await loadStore();
    expect(store.getState().accepted).toBe(true);
  });

  it('re-prompts when the accepted terms are outdated', async () => {
    saveConsent({ accepted: true, version: CONSENT_VERSION - 1, acceptedAt: 1 });
    const store = await loadStore();
    expect(store.getState().accepted).toBe(false);
  });
});

describe('consentStore actions', () => {
  it('markHumanVerified opens the gate and remembers the check', async () => {
    const store = await loadStore();
    const verifiedUntil = Date.now() + 60_000;
    store.getState().markHumanVerified(verifiedUntil);
    expect(store.getState().humanVerified).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('jsonprism.humanCheck') as string)).toEqual({
      verifiedUntil,
    });

    // A returning visitor within the TTL is not challenged again.
    expect((await loadStore()).getState().humanVerified).toBe(true);
  });

  it('allowUnverified lets the user in for this session only', async () => {
    const store = await loadStore();
    store.getState().allowUnverified();
    expect(store.getState().humanVerified).toBe(true);
    expect(window.localStorage.getItem('jsonprism.humanCheck')).toBeNull();

    expect((await loadStore()).getState().humanVerified).toBe(false);
  });
});
