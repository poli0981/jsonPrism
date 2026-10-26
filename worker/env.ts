/** Bindings and vars the Worker reads (declared in wrangler.jsonc). */
export interface WorkerEnv {
  ASSETS: Fetcher;
  /** Comma-separated hostnames a token may have been issued on. */
  ALLOWED_HOSTNAMES: string;
  /** Secret set in the Cloudflare dashboard (.dev.vars locally). */
  TURNSTILE_SECRET?: string | undefined;
  /** Pages and public files: everything outside /api/ and the hashed /assets/ bundles. */
  SITE_LIMITER?: RateLimit;
  /** Every /api/* request. */
  API_LIMITER?: RateLimit;
  /** /api/turnstile/verify on top of API_LIMITER. */
  VERIFY_LIMITER?: RateLimit;
}
