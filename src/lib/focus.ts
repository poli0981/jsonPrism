/** `id` of the page's `<main>` landmark — the skip link and route changes move focus there. */
export const MAIN_ID = 'main';

/**
 * Moves keyboard focus to the `<main>` landmark (it has `tabIndex={-1}`), so
 * the next Tab continues inside the page content and screen readers start
 * reading there. Returns `false` when the landmark isn't mounted.
 */
export function focusMain(options: FocusOptions = {}): boolean {
  const main = document.getElementById(MAIN_ID);
  if (!main) return false;
  main.focus(options);
  return true;
}
