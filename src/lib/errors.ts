/**
 * Normalizes anything thrown into a user-presentable message. Libraries and
 * engines may throw strings, plain objects or `Error`s with an empty message;
 * `(err as Error).message` would print `undefined` for those.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err) ?? String(err);
  } catch {
    return String(err);
  }
}
