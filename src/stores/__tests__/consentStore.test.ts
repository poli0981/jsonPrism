import { beforeEach, describe, expect, it } from 'vitest';
import { useConsentStore } from '../consentStore';
import { CONSENT_VERSION } from '@/lib/consent-storage';

beforeEach(() => {
  window.localStorage.clear();
  useConsentStore.setState({ accepted: false });
});

describe('consentStore', () => {
  it('starts not accepted on the web', () => {
    expect(useConsentStore.getState().accepted).toBe(false);
  });

  it('accept() flips state and persists version + timestamp', () => {
    useConsentStore.getState().accept();
    expect(useConsentStore.getState().accepted).toBe(true);

    const raw = window.localStorage.getItem('jsonprism.consent');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string) as {
      accepted: boolean;
      version: number;
      acceptedAt: number;
    };
    expect(parsed.accepted).toBe(true);
    expect(parsed.version).toBe(CONSENT_VERSION);
    expect(typeof parsed.acceptedAt).toBe('number');
  });
});
