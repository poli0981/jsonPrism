/**
 * localStorage access that never throws. Browsers throw on *access* when site
 * data is blocked (SecurityError) and on writes when full or in some private
 * modes; none of that may take the app down.
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* non-fatal */
  }
}

/** Parses a stored JSON value; malformed or missing data yields null. */
export function safeGetJson(key: string): unknown {
  const raw = safeGetItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}
