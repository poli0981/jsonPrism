/**
 * Persists the user's acceptance of the legal terms (web + Android + desktop
 * builds without an installer license page). SSR-safe and never throws —
 * private-mode / blocked-storage errors degrade to "not accepted" → re-prompt.
 */

import { safeGetJson, safeSetItem } from './safe-storage';

/**
 * Bump when the referenced terms change to re-prompt previously-consented users.
 * v2 (2.0.0): new domain on Cloudflare, Web Analytics + Turnstile on the web build.
 */
export const CONSENT_VERSION = 2;

const KEY = 'jsonprism.consent';

export interface StoredConsent {
  accepted: boolean;
  version: number;
  acceptedAt: number;
}

export function loadConsent(): StoredConsent | null {
  const value = safeGetJson(KEY);
  if (value === null || typeof value !== 'object') return null;
  const { accepted, version, acceptedAt } = value as Partial<StoredConsent>;
  if (typeof accepted !== 'boolean' || typeof version !== 'number') return null;
  return { accepted, version, acceptedAt: typeof acceptedAt === 'number' ? acceptedAt : 0 };
}

export function saveConsent(consent: StoredConsent): void {
  safeSetItem(KEY, JSON.stringify(consent));
}

export function isConsentValid(consent: StoredConsent | null): boolean {
  return !!consent && consent.accepted === true && consent.version === CONSENT_VERSION;
}
