import { describe, expect, it, vi } from 'vitest';
import { MAX_TOKEN_LENGTH, SITEVERIFY_URL, verifyTurnstileToken } from '../turnstile';

const NOW = Date.parse('2026-10-22T10:00:00Z');

function siteverify(body: Record<string, unknown>, status = 200) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const strict = {
  token: 'token',
  secret: 'real-secret',
  testMode: false,
  expectedHostnames: ['jsonprism.poli0981.dev'],
  expectedAction: 'gate',
  now: () => NOW,
};

const passing = {
  success: true,
  hostname: 'jsonprism.poli0981.dev',
  action: 'gate',
  challenge_ts: '2026-10-22T09:59:30Z',
};

describe('verifyTurnstileToken', () => {
  it('accepts a fresh token for the right hostname and action', async () => {
    const fetchImpl = siteverify(passing);
    expect(await verifyTurnstileToken({ ...strict, fetchImpl })).toEqual({ ok: true });
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(SITEVERIFY_URL);
    const sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(sent).toMatchObject({ secret: 'real-secret', response: 'token' });
    expect(typeof sent['idempotency_key']).toBe('string');
    expect(sent).not.toHaveProperty('remoteip');
  });

  it('rejects tokens issued for another hostname or action', async () => {
    expect(
      await verifyTurnstileToken({
        ...strict,
        fetchImpl: siteverify({ ...passing, hostname: 'evil.example' }),
      }),
    ).toEqual({ ok: false, reason: 'rejected', codes: ['hostname-mismatch'] });
    expect(
      await verifyTurnstileToken({
        ...strict,
        fetchImpl: siteverify({ ...passing, action: 'login' }),
      }),
    ).toEqual({ ok: false, reason: 'rejected', codes: ['action-mismatch'] });
  });

  it('rejects tokens older than five minutes', async () => {
    const fetchImpl = siteverify({ ...passing, challenge_ts: '2026-10-22T09:50:00Z' });
    expect(await verifyTurnstileToken({ ...strict, fetchImpl })).toMatchObject({
      reason: 'rejected',
      codes: ['token-expired'],
    });
  });

  it('passes Cloudflare error codes through as a rejection', async () => {
    const fetchImpl = siteverify({ success: false, 'error-codes': ['timeout-or-duplicate'] });
    expect(await verifyTurnstileToken({ ...strict, fetchImpl })).toEqual({
      ok: false,
      reason: 'rejected',
      codes: ['timeout-or-duplicate'],
    });
  });

  it('treats internal errors and a bad secret as unavailable, not as a bot', async () => {
    expect(
      await verifyTurnstileToken({
        ...strict,
        fetchImpl: siteverify({ success: false, 'error-codes': ['internal-error'] }),
      }),
    ).toMatchObject({ reason: 'unavailable' });
    expect(
      await verifyTurnstileToken({
        ...strict,
        fetchImpl: siteverify({ success: false, 'error-codes': ['invalid-input-secret'] }),
      }),
    ).toMatchObject({ reason: 'unavailable', detail: 'misconfigured-secret' });
  });

  it('retries once on a 5xx with the same idempotency key', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('oops', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(passing)));
    expect(await verifyTurnstileToken({ ...strict, fetchImpl })).toEqual({ ok: true });
    const keys = fetchImpl.mock.calls.map(
      ([, init]) => (JSON.parse(String(init?.body)) as { idempotency_key: string }).idempotency_key,
    );
    expect(keys[0]).toBe(keys[1]);
  });

  it('reports unavailable when siteverify cannot be reached', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('network down'));
    expect(await verifyTurnstileToken({ ...strict, fetchImpl })).toMatchObject({
      ok: false,
      reason: 'unavailable',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('refuses empty or oversized tokens without calling Cloudflare', async () => {
    const fetchImpl = siteverify(passing);
    expect((await verifyTurnstileToken({ ...strict, token: '', fetchImpl })).ok).toBe(false);
    expect(
      (
        await verifyTurnstileToken({
          ...strict,
          token: 'x'.repeat(MAX_TOKEN_LENGTH + 1),
          fetchImpl,
        })
      ).ok,
    ).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('skips hostname/action checks only in test mode', async () => {
    const fetchImpl = siteverify({ success: true, hostname: 'example.com', action: '' });
    expect(await verifyTurnstileToken({ ...strict, testMode: true, fetchImpl })).toEqual({
      ok: true,
    });
  });
});
