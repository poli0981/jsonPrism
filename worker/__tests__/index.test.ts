import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../index';
import { handleVerify, VERIFIED_TTL_MS, type WorkerEnv } from '../verify';
import { TEST_SECRET } from '../turnstile';

const ORIGIN = 'https://jsonprism.poli0981.dev';
const URL_VERIFY = `${ORIGIN}/api/turnstile/verify`;

function env(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ASSETS: {} as Fetcher,
    ALLOWED_HOSTNAMES: 'jsonprism.poli0981.dev',
    TURNSTILE_SECRET: 'real-secret',
    ...overrides,
  };
}

function verifyRequest(
  init: { body?: string; headers?: Record<string, string>; method?: string } = {},
) {
  return new Request(URL_VERIFY, {
    method: init.method ?? 'POST',
    headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...init.headers },
    ...(init.method === 'GET' ? {} : { body: init.body ?? JSON.stringify({ token: 'tok' }) }),
  });
}

const call = (request: Request, e: WorkerEnv = env()) => handleVerify(request, e);

let siteverify: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  // A fresh Response per call: bodies can only be read once.
  siteverify = vi.fn<typeof fetch>().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          success: true,
          hostname: 'jsonprism.poli0981.dev',
          action: 'gate',
          challenge_ts: new Date().toISOString(),
        }),
      ),
  );
  vi.stubGlobal('fetch', siteverify);
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/turnstile/verify', () => {
  it('returns a verifiedUntil timestamp for a valid token', async () => {
    const before = Date.now();
    const res = await call(verifyRequest());
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    const body = (await res.json()) as { ok: boolean; verifiedUntil: number };
    expect(body.ok).toBe(true);
    expect(body.verifiedUntil).toBeGreaterThanOrEqual(before + VERIFIED_TTL_MS);
  });

  it('rejects other methods with 405 and an Allow header', async () => {
    const res = await call(verifyRequest({ method: 'GET' }));
    expect(res.status).toBe(405);
    expect(res.headers.get('Allow')).toBe('POST');
  });

  it('rejects cross-origin and origin-less requests', async () => {
    expect(
      (await call(verifyRequest({ headers: { Origin: 'https://evil.example' } }))).status,
    ).toBe(403);
    const noOrigin = new Request(URL_VERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"token":"t"}',
    });
    expect((await call(noOrigin)).status).toBe(403);
  });

  it('requires JSON', async () => {
    expect((await call(verifyRequest({ headers: { 'Content-Type': 'text/plain' } }))).status).toBe(
      415,
    );
  });

  it('refuses oversized bodies even when Content-Length lies', async () => {
    const res = await call(verifyRequest({ body: JSON.stringify({ token: 'x'.repeat(10_000) }) }));
    expect(res.status).toBe(413);
  });

  it('validates the token field', async () => {
    expect((await call(verifyRequest({ body: '{"token":42}' }))).status).toBe(400);
    expect((await call(verifyRequest({ body: 'not json' }))).status).toBe(400);
  });

  it('rate limits per client', async () => {
    const limiter = {
      limit: vi.fn().mockResolvedValue({ success: false }),
    } as unknown as RateLimit;
    const res = await call(
      verifyRequest({ headers: { 'CF-Connecting-IP': '203.0.113.9' } }),
      env({ VERIFY_LIMITER: limiter }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
  });

  it('answers 503 when the secret is missing', async () => {
    const res = await call(verifyRequest(), env({ TURNSTILE_SECRET: undefined }));
    expect(res.status).toBe(503);
    expect(siteverify).not.toHaveBeenCalled();
  });

  it('returns a generic 403 (no Cloudflare codes) for a rejected token', async () => {
    siteverify.mockImplementation(
      async () =>
        new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] })),
    );
    const res = await call(verifyRequest());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: 'rejected' });
  });

  it('uses relaxed checks only with Cloudflare’s test secret', async () => {
    siteverify.mockImplementation(
      async () =>
        new Response(JSON.stringify({ success: true, hostname: 'example.com', action: '' })),
    );
    expect((await call(verifyRequest(), env({ TURNSTILE_SECRET: TEST_SECRET }))).status).toBe(
      200,
    );
    expect((await call(verifyRequest())).status).toBe(403);
  });

  it.each(['http://127.0.0.1:8787', 'http://jsonprism.poli0981.dev'])(
    'accepts the local origin %s only with the test secret (wrangler dev)',
    async (origin) => {
      const local = verifyRequest({ headers: { Origin: origin } });
      const testEnv = env({ TURNSTILE_SECRET: TEST_SECRET });
      expect((await call(local.clone(), testEnv)).status).toBe(200);
      expect((await call(local)).status).toBe(403);
    },
  );
});

describe('router', () => {
  it('serves a health check and JSON 404s under /api', async () => {
    const health = await worker.fetch(new Request(`${ORIGIN}/api/health`), env());
    expect(await health.json()).toEqual({ ok: true, service: 'jsonprism' });
    const missing = await worker.fetch(new Request(`${ORIGIN}/api/nope`), env());
    expect(missing.status).toBe(404);
  });
});
