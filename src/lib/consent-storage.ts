/**
 * Persists the user's acceptance of the legal terms (web only). Mirrors the
 * defensive pattern in {@link file://./options-storage.ts}: SSR-safe, never
 * throws (private-mode / quota errors degrade to "not accepted" → re-prompt).
 */

/** Bump when the referenced terms change to re-prompt previously-consented users. */
export const CONSENT_VERSION = 1;

const KEY = 'jsonprism.consent';

export interface StoredConsent {
  accepted: boolean;
  version: number;
  acceptedAt: number;
}

export function loadConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredConsent;
  } catch {
    return null;
  }
}

export function saveConsent(consent: StoredConsent): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(consent));
  } catch {
    /* quota / serialization / private-mode write errors are non-fatal */
  }
}

export function isConsentValid(consent: StoredConsent | null): boolean {
  return !!consent && consent.accepted === true && consent.version === CONSENT_VERSION;
}
