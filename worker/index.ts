/**
 * JSONPrism edge Worker. `run_worker_first` sends every request here except the
 * hashed bundles under /assets/, which Workers Static Assets serves directly.
 * Each request is counted against a per-client rate limit first; pages and
 * public files are then handed to the ASSETS binding (which still applies
 * public/_headers, public/_redirects and the SPA fallback), and /api/* is
 * answered here. Conversion never happens server-side.
 *
 * Only the default export may live in this module: workerd treats every named
 * export of the entry module as an entrypoint and refuses to start otherwise.
 */

import type { WorkerEnv } from './env';
import { json } from './http';
import { throttle } from './rate-limit';
import { handleVerify } from './verify';

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) {
      return (await throttle(request, env.SITE_LIMITER, 'site')) ?? env.ASSETS.fetch(request);
    }
    const limited = await throttle(request, env.API_LIMITER, 'api');
    if (limited) return limited;
    switch (url.pathname) {
      case '/api/turnstile/verify':
        return handleVerify(request, env);
      case '/api/health':
        return json({ ok: true, service: 'jsonprism' });
      default:
        return json({ ok: false, error: 'not_found' }, 404);
    }
  },
} satisfies ExportedHandler<WorkerEnv>;
