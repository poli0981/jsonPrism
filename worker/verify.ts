/**
 * POST /api/turnstile/verify — server-side check of the web build's Cloudflare
 * Turnstile token. Kept out of worker/index.ts because workerd treats every
 * named export of the entry module as an entrypoint.
 *
 * The check is deterrence, stored client-side once passed: the app itself is
 * public static files, so there is no server resource it unlocks.
 */

import { json, logEvent } from './http';
import { MAX_TOKEN_LENGTH, TEST_SECRET, verifyTurnstileToken } from './turnstile';

export interface WorkerEnv {
  ASSETS: Fetcher;
  /** Comma-separated hostnames a token may have been issued on. */
  ALLOWED_HOSTNAMES: string;
  /** Secret set in the Cloudflare dashboard (.dev.vars locally). */
  TURNSTILE_SECRET_KEY?: string | undefined;
  VERIFY_LIMITER?: RateLimit;
}

/** Keep in sync with src/lib/turnstile.ts (TURNSTILE_ACTION). */
const TURNSTILE_ACTION = 'gate';
/** How long the browser may trust a passed check. Keep in sync with src/lib/human-check-storage.ts. */
export const VERIFIED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 4096;

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function allowedHostnames(env: WorkerEnv): string[] {
  return env.ALLOWED_HOSTNAMES.split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Same-site only: the token must come from this site's own pages. Under
 * Cloudflare's always-pass test secret (local `wrangler dev`, which rewrites
 * the URL and Origin to `http://<route host>`) plain http and loopback origins
 * pass too; that secret proves nothing, so nothing is lost.
 */
function isAllowedOrigin(origin: string | null, env: WorkerEnv, testMode: boolean): boolean {
  if (!origin) return false;
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const hostname = parsed.hostname.toLowerCase();
  if (testMode) return isLocalHost(hostname) || allowedHostnames(env).includes(hostname);
  return parsed.protocol === 'https:' && allowedHostnames(env).includes(hostname);
}

/** Reads at most `limit` bytes of the body; null when it is larger (Content-Length can lie). */
async function readBodyLimited(request: Request, limit: number): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function handleVerify(request: Request, env: WorkerEnv): Promise<Response> {
  const started = Date.now();
  const secret = env.TURNSTILE_SECRET_KEY;
  const testMode = secret === TEST_SECRET;
  const colo = (request.cf as { colo?: string } | undefined)?.colo;
  const finish = (
    status: number,
    body: Record<string, unknown>,
    outcome: string,
    extra: Record<string, unknown> = {},
  ) => {
    logEvent('turnstile.verify', { outcome, status, colo, ms: Date.now() - started, ...extra });
    const headers: Record<string, string> =
      status === 405 ? { Allow: 'POST' } : status === 429 ? { 'Retry-After': '60' } : {};
    return json(body, status, headers);
  };

  if (request.method !== 'POST')
    return finish(405, { ok: false, error: 'method_not_allowed' }, 'bad-method');
  if (!isAllowedOrigin(request.headers.get('Origin'), env, testMode)) {
    return finish(403, { ok: false, error: 'forbidden_origin' }, 'bad-origin');
  }
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
    return finish(415, { ok: false, error: 'unsupported_media_type' }, 'bad-content-type');
  }
  if (Number(request.headers.get('Content-Length') ?? '0') > MAX_BODY_BYTES) {
    return finish(413, { ok: false, error: 'payload_too_large' }, 'too-large');
  }

  if (env.VERIFY_LIMITER) {
    // Generous per-client throttle; shared IPs (NAT, mobile carriers) still fit.
    const key = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { success } = await env.VERIFY_LIMITER.limit({ key });
    if (!success) return finish(429, { ok: false, error: 'rate_limited' }, 'rate-limited');
  }

  const raw = await readBodyLimited(request, MAX_BODY_BYTES);
  if (raw === null) return finish(413, { ok: false, error: 'payload_too_large' }, 'too-large');
  let token: unknown;
  try {
    token = (JSON.parse(raw) as { token?: unknown }).token;
  } catch {
    return finish(400, { ok: false, error: 'invalid_json' }, 'bad-json');
  }
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return finish(400, { ok: false, error: 'invalid_token' }, 'bad-token');
  }

  if (!secret) {
    // Surfaces in Workers Logs; the browser treats 503 as "verification unavailable".
    return finish(503, { ok: false, error: 'unavailable' }, 'misconfigured');
  }

  const result = await verifyTurnstileToken({
    token,
    secret,
    // Cloudflare's dummy secret returns placeholder hostname/action values;
    // it can only be configured locally (.dev.vars).
    testMode,
    expectedHostnames: allowedHostnames(env),
    expectedAction: TURNSTILE_ACTION,
  });
  if (result.ok) {
    return finish(200, { ok: true, verifiedUntil: Date.now() + VERIFIED_TTL_MS }, 'verified');
  }
  if (result.reason === 'rejected') {
    // Details stay in the logs; the client only needs "rejected".
    return finish(403, { ok: false, error: 'rejected' }, 'rejected', { codes: result.codes });
  }
  return finish(503, { ok: false, error: 'unavailable' }, 'unavailable', { detail: result.detail });
}
