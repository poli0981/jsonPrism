/**
 * Cloudflare Turnstile settings for the web build's human check.
 *
 * The widget only runs on the web: desktop and Android builds are offline-first
 * and have no Worker to verify tokens against. In `npm run dev` it is off unless
 * `VITE_TURNSTILE_DEV=1`; on localhost (e.g. `npm run preview:cf`) Cloudflare's
 * always-pass test key is used because the production key is bound to
 * jsonprism.poli0981.dev.
 */

/** Production sitekey (public by design). */
const PRODUCTION_SITE_KEY = '0x4AAAAAAFgqIzSPBs9hZJnX';
/** Cloudflare's documented test sitekey that always passes. */
export const TEST_SITE_KEY = '1x00000000000000000000AA';

/** Must match the `action` the Worker expects (worker/verify.ts). */
export const TURNSTILE_ACTION = 'gate';
const VERIFY_ENDPOINT = '/api/turnstile/verify';

export function isTurnstileEnabled(): boolean {
  if (__IS_TAURI_BUILD__) return false;
  return import.meta.env.PROD || import.meta.env.VITE_TURNSTILE_DEV === '1';
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

export function turnstileSiteKey(hostname: string = window.location.hostname): string {
  const configured = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (configured) return configured;
  return isLocalHost(hostname) ? TEST_SITE_KEY : PRODUCTION_SITE_KEY;
}

/** Turnstile widget language codes for the app's locales. */
export function turnstileLanguage(appLanguage: string | undefined): string {
  switch (appLanguage) {
    case 'vi':
      return 'vi';
    case 'ja':
      return 'ja';
    case 'zh-CN':
      return 'zh-cn';
    default:
      return 'en';
  }
}

export type VerifyResult =
  | { status: 'verified'; verifiedUntil: number }
  | { status: 'rejected'; codes: string[] }
  | { status: 'unavailable'; reason: string };

/**
 * Sends a widget token to the Worker. Distinguishes a real rejection (the
 * token failed siteverify — keep the gate closed) from infrastructure trouble
 * (offline, 5xx, timeout — let the user through with a warning, since the app
 * itself runs entirely in the browser).
 */
export async function verifyToken(
  token: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 15_000,
): Promise<VerifyResult> {
  let response: Response;
  try {
    response = await fetchImpl(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      credentials: 'same-origin',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    return { status: 'unavailable', reason: err instanceof Error ? err.name : 'network' };
  }
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // fall through with body = null
  }
  const data = (body ?? {}) as { ok?: unknown; verifiedUntil?: unknown; codes?: unknown };
  if (response.ok && data.ok === true && typeof data.verifiedUntil === 'number') {
    return { status: 'verified', verifiedUntil: data.verifiedUntil };
  }
  if (response.status === 400 || response.status === 403) {
    const codes = Array.isArray(data.codes) ? data.codes.filter((c) => typeof c === 'string') : [];
    return { status: 'rejected', codes };
  }
  return { status: 'unavailable', reason: `http-${response.status}` };
}
