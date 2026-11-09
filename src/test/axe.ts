import axe from 'axe-core';

/**
 * Runs axe-core (WCAG 2.x A/AA rules plus best practices) on `context` and
 * returns one readable line per violation, so a failing test shows what broke
 * and where. jsdom has no layout or paint, so rules that need them are off:
 * `color-contrast` is checked by hand (see ACCESSIBILITY.md).
 */
export async function axeViolations(context: Element | Document = document): Promise<string[]> {
  const results = await axe.run(context, {
    rules: { 'color-contrast': { enabled: false } },
    resultTypes: ['violations'],
  });
  return results.violations.map(
    (v) =>
      `${v.id} (${v.impact ?? 'n/a'}): ${v.help} → ${v.nodes
        .map((node) => node.target.join(' '))
        .join(', ')}`,
  );
}
