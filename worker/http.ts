/** JSON responses for the API routes, with defensive headers (assets get theirs from public/_headers). */

const API_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

export function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...API_HEADERS, ...extraHeaders },
  });
}

/** Structured log line for Workers Logs. Never pass tokens, IPs or user content. */
export function logEvent(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...fields }));
}
