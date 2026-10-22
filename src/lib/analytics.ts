/**
 * Cloudflare Web Analytics for the public web build.
 *
 * Privacy rules (see PRIVACY.md):
 *  - only on the production site (jsonprism.poli0981.dev) — never in Tauri
 *    desktop/Android, local previews, or dev
 *  - loaded only after the user accepted the Terms & Privacy Policy
 *  - off when the user turned "Anonymous usage analytics" off, and off by
 *    default when the browser sends Global Privacy Control
 * The beacon is cookieless and never sees editor content.
 */

export const PRODUCTION_HOSTNAME = 'jsonprism.poli0981.dev';
const BEACON_SRC = 'https://static.cloudflareinsights.com/beacon.min.js';
const BEACON_TOKEN = 'f1f718464e5a417997c84170ddbec2b6';

export interface AnalyticsEnvironment {
  isTauriBuild: boolean;
  hostname: string;
  consented: boolean;
  /** The user's "Anonymous usage analytics" preference. */
  enabled: boolean;
}

export function shouldLoadWebAnalytics(env: AnalyticsEnvironment): boolean {
  return !env.isTauriBuild && env.hostname === PRODUCTION_HOSTNAME && env.consented && env.enabled;
}

/**
 * Injects the Cloudflare beacon exactly as the dashboard snippet does. The
 * beacon finds its config via `script[data-cf-beacon]`, so a dynamically added
 * module script behaves the same as the static tag. Idempotent; returns
 * whether the beacon is (now) present.
 */
export function loadWebAnalytics(
  env: Omit<AnalyticsEnvironment, 'isTauriBuild' | 'hostname'>,
  doc: Document = document,
): boolean {
  const allowed = shouldLoadWebAnalytics({
    ...env,
    isTauriBuild: __IS_TAURI_BUILD__,
    hostname: doc.location?.hostname ?? '',
  });
  if (!allowed) return false;
  if (doc.querySelector('script[data-cf-beacon]')) return true;
  const script = doc.createElement('script');
  script.type = 'module';
  script.src = BEACON_SRC;
  script.setAttribute('data-cf-beacon', JSON.stringify({ token: BEACON_TOKEN }));
  doc.head.appendChild(script);
  return true;
}
