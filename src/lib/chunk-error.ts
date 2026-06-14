// A dynamic import() rejects with one of these messages when its chunk can't be
// fetched — typically a stale deploy (hashed filename gone) or a dropped network
// mid-navigation.
const CHUNK_ERROR_RE =
  /Loading chunk|Loading CSS chunk|dynamically imported module|Failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return CHUNK_ERROR_RE.test(msg);
}
