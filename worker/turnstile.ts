/**
 * Server-side Turnstile token verification (Cloudflare siteverify).
 * Pure apart from `fetch`, which is injectable for tests.
 */

export const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Cloudflare's documented test secret that always passes (local development only). */
export const TEST_SECRET = '1x0000000000000000000000000000000AA';
/** Tokens are valid for 300 s after the challenge was solved. */
const TOKEN_MAX_AGE_MS = 300_000;
/** Turnstile tokens are at most 2048 characters. */
export const MAX_TOKEN_LENGTH = 2048;

interface SiteverifyResponse {
  success?: boolean;
  'error-codes'?: unknown;
  hostname?: unknown;
  action?: unknown;
  challenge_ts?: unknown;
}

export type VerifyOutcome =
  | { ok: true }
  | { ok: false; reason: 'rejected'; codes: string[] }
  | { ok: false; reason: 'unavailable'; detail: string };

export interface VerifyParams {
  token: string;
  secret: string;
  /** Skip hostname/action checks — only for the always-pass test secret. */
  testMode: boolean;
  expectedHostnames: readonly string[];
  expectedAction: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  timeoutMs?: number;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

export async function verifyTurnstileToken(params: VerifyParams): Promise<VerifyOutcome> {
  const { token, secret, testMode, expectedHostnames, expectedAction } = params;
  const fetchImpl = params.fetchImpl ?? fetch;
  const now = params.now ?? Date.now;
  const timeoutMs = params.timeoutMs ?? 8_000;

  if (token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'rejected', codes: ['invalid-input-response'] };
  }

  // One idempotency key for every attempt: a retried request after a network
  // blip is answered from Cloudflare's cache instead of failing as a replay.
  const idempotencyKey = crypto.randomUUID();
  let data: SiteverifyResponse | null = null;
  let lastProblem = 'unknown';
  for (let attempt = 0; attempt < 2 && data === null; attempt++) {
    try {
      const response = await fetchImpl(SITEVERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // remoteip is optional and deliberately omitted (data minimisation).
        body: JSON.stringify({ secret, response: token, idempotency_key: idempotencyKey }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status >= 500) {
        lastProblem = `siteverify-${response.status}`;
        continue;
      }
      data = (await response.json()) as SiteverifyResponse;
    } catch (err) {
      lastProblem = err instanceof Error ? err.name : 'network';
    }
  }
  if (data === null) return { ok: false, reason: 'unavailable', detail: lastProblem };

  const codes = stringList(data['error-codes']);
  if (data.success !== true) {
    // internal-error means "try again", not "this visitor is a bot".
    if (codes.includes('internal-error'))
      return { ok: false, reason: 'unavailable', detail: 'internal-error' };
    if (codes.includes('missing-input-secret') || codes.includes('invalid-input-secret')) {
      return { ok: false, reason: 'unavailable', detail: 'misconfigured-secret' };
    }
    return { ok: false, reason: 'rejected', codes };
  }
  if (testMode) return { ok: true };

  if (typeof data.hostname !== 'string' || !expectedHostnames.includes(data.hostname)) {
    return { ok: false, reason: 'rejected', codes: ['hostname-mismatch'] };
  }
  if (data.action !== expectedAction) {
    return { ok: false, reason: 'rejected', codes: ['action-mismatch'] };
  }
  if (typeof data.challenge_ts === 'string') {
    const solvedAt = Date.parse(data.challenge_ts);
    if (Number.isFinite(solvedAt) && now() - solvedAt > TOKEN_MAX_AGE_MS) {
      return { ok: false, reason: 'rejected', codes: ['token-expired'] };
    }
  }
  return { ok: true };
}
