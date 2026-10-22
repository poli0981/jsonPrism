/** Canonical external locations used across the UI. */

export const REPO_URL = 'https://github.com/poli0981/jsonPrism';
export const SITE_URL = 'https://jsonprism.poli0981.dev';

/**
 * Link to a repository document *as of this build's commit*, so the terms a
 * user accepts can't change underneath them. Local builds without a commit
 * fall back to `main`.
 */
export function legalDocUrl(file: string, commit: string = __APP_COMMIT__): string {
  const ref = /^[0-9a-f]{7,40}$/i.test(commit) ? commit : 'main';
  return `${REPO_URL}/blob/${ref}/${file}`;
}

export const CONTACTS = {
  security: 'security@poli0981.dev',
  privacy: 'privacy@poli0981.dev',
  legal: 'legal@poli0981.dev',
  code: 'code@poli0981.dev',
  sponsor: 'sponsor@poli0981.dev',
} as const;
