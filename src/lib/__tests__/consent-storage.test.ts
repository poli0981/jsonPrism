import { afterEach, describe, expect, it } from 'vitest';
import {
  CONSENT_VERSION,
  isConsentValid,
  loadConsent,
  saveConsent,
  type StoredConsent,
} from '../consent-storage';

const KEY = 'jsonprism.consent';

afterEach(() => {
  window.localStorage.clear();
});

describe('consent-storage', () => {
  it('returns null when nothing is stored', () => {
    expect(loadConsent()).toBeNull();
  });

  it('round-trips through saveConsent / loadConsent', () => {
    const consent: StoredConsent = { accepted: true, version: CONSENT_VERSION, acceptedAt: 123 };
    saveConsent(consent);
    expect(loadConsent()).toEqual(consent);
  });

  it('returns null when the stored value is malformed', () => {
    window.localStorage.setItem(KEY, '{not valid json');
    expect(loadConsent()).toBeNull();
  });

  it('isConsentValid is true only for accepted + current version', () => {
    expect(isConsentValid(null)).toBe(false);
    expect(isConsentValid({ accepted: false, version: CONSENT_VERSION, acceptedAt: 0 })).toBe(
      false,
    );
    expect(isConsentValid({ accepted: true, version: CONSENT_VERSION - 1, acceptedAt: 0 })).toBe(
      false,
    );
    expect(isConsentValid({ accepted: true, version: CONSENT_VERSION, acceptedAt: 0 })).toBe(true);
  });
});
