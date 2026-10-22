/**
 * Remembers a passed Cloudflare Turnstile check (web build only) so returning
 * visitors aren't challenged on every visit. Same defensive pattern as
 * consent-storage: never throws, malformed data counts as "not verified".
 */

import { safeGetJson, safeRemoveItem, safeSetItem } from './safe-storage';

/** A passed check is trusted for 7 days, then re-verified. */
export const HUMAN_CHECK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const KEY = 'jsonprism.humanCheck';

export interface StoredHumanCheck {
  verifiedUntil: number;
}

export function loadHumanCheck(): StoredHumanCheck | null {
  const value = safeGetJson(KEY);
  if (value === null || typeof value !== 'object') return null;
  const { verifiedUntil } = value as Partial<StoredHumanCheck>;
  return typeof verifiedUntil === 'number' && Number.isFinite(verifiedUntil)
    ? { verifiedUntil }
    : null;
}

export function saveHumanCheck(verifiedUntil: number): void {
  safeSetItem(KEY, JSON.stringify({ verifiedUntil } satisfies StoredHumanCheck));
}

export function clearHumanCheck(): void {
  safeRemoveItem(KEY);
}

export function isHumanCheckValid(check: StoredHumanCheck | null, now = Date.now()): boolean {
  // Also reject timestamps implausibly far in the future (clock tampering, bad data).
  return (
    !!check && check.verifiedUntil > now && check.verifiedUntil <= now + HUMAN_CHECK_TTL_MS * 2
  );
}
