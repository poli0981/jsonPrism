/**
 * JSONPrism edge Worker. Static assets (the SPA) are served by Workers Static
 * Assets before this code runs; `run_worker_first: ["/api/*"]` routes only the
 * API here. Conversion never happens server-side.
 *
 * Only the default export may live in this module: workerd treats every named
 * export of the entry module as an entrypoint and refuses to start otherwise.
 */

import { json } from './http';
import { handleVerify, type WorkerEnv } from './verify';

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
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
