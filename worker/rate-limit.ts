/**
 * Per-client throttles. Every request except the hashed bundles under /assets/
 * reaches the Worker (`run_worker_first` in wrangler.jsonc): pages and public
 * files count against SITE_LIMITER, /api/* against API_LIMITER, and the
 * human-check endpoint also against its own VERIFY_LIMITER.
 *
 * Cloudflare's counts are approximate: each edge machine checks a locally
 * cached per-data-centre count that syncs in the background, so a burst
 * spread over many fresh connections can pass well beyond the limit before
 * the 429s start (see docs/DEPLOYMENT.md). The limits throttle browsers,
 * crawlers and simple scripts; people never get near them.
 */

import { json, logEvent, text } from './http';

/** Every limiter uses a 60-second period, so a minute is always enough. */
const RETRY_AFTER = '60';

/** The SPA isn't loaded yet when a page is refused, so the edge answers in all four UI languages. */
const SITE_MESSAGE = [
  'Too many requests. Wait a minute, then try again.',
  'Quá nhiều yêu cầu. Vui lòng đợi một phút rồi thử lại.',
  'リクエストが多すぎます。1 分ほど待ってから、もう一度お試しください。',
  '请求过多。请等待一分钟后再试。',
].join('\n');

type LimitScope = 'site' | 'api';

/**
 * The limiter key: the client's IPv4 address, or the /64 network of an IPv6
 * address — one subscriber usually holds a whole /64 and could otherwise
 * rotate through it. Only ever a key; never logged.
 */
export function clientKey(request: Request): string {
  const ip = request.headers.get('CF-Connecting-IP')?.trim().toLowerCase();
  if (!ip) return 'unknown';
  // IPv4, or IPv6 with an embedded IPv4 tail (::ffff:192.0.2.1): keep it whole.
  if (!ip.includes(':') || ip.includes('.')) return ip;
  const [head = '', tail] = ip.split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups =
    tail === undefined
      ? left
      : [
          ...left,
          ...Array<string>(Math.max(0, 8 - left.length - right.length)).fill('0'),
          ...right,
        ];
  const prefix = groups.slice(0, 4).map((group) => Number.parseInt(group, 16).toString(16));
  return `${prefix.join(':')}::/64`;
}

/**
 * Counts the request. Returns the 429 response when the client is over the
 * limit, otherwise null. Without the binding (unit tests) or when the limiter
 * itself fails, the request goes through: a broken counter must not take the
 * site down.
 */
export async function throttle(
  request: Request,
  limiter: RateLimit | undefined,
  scope: LimitScope,
): Promise<Response | null> {
  if (!limiter) return null;
  const colo = (request.cf as { colo?: string } | undefined)?.colo;
  let success: boolean;
  try {
    ({ success } = await limiter.limit({ key: clientKey(request) }));
  } catch (error) {
    logEvent('ratelimit.error', {
      scope,
      colo,
      detail: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
  if (success) return null;
  logEvent('ratelimit.exceeded', { scope, colo });
  const headers = { 'Retry-After': RETRY_AFTER };
  return scope === 'api'
    ? json({ ok: false, error: 'rate_limited' }, 429, headers)
    : text(SITE_MESSAGE, 429, headers);
}
