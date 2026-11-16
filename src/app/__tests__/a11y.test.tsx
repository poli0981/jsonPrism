import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import '@/i18n';
import { App } from '../App';
import { axeViolations } from '@/test/axe';
import { stubRangeGeometry } from '@/test/range-geometry';
import { useConsentStore } from '@/stores/consentStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

vi.mock('@/lib/analytics', () => ({ loadWebAnalytics: vi.fn(() => false) }));

stubRangeGeometry();

beforeEach(() => {
  // axe probes <canvas> for icon fonts; jsdom only logs "not implemented".
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

function renderApp(path = '/') {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
  return user;
}

/**
 * Waits for the real CodeMirror editor, which loads as its own chunk. Until
 * then a plain <textarea> with the same name stands in, so match on the
 * editor's content element, not just the role and name.
 */
async function findInputEditor() {
  return waitFor(
    () => {
      const editor = screen.getByRole('textbox', { name: 'Input JSON' });
      expect(editor).toHaveClass('cm-content');
      return editor;
    },
    { timeout: 10_000 },
  );
}

beforeEach(() => {
  useConsentStore.setState({ accepted: true, humanVerified: true });
  useWorkspaceStore.setState({
    input: '[{"id":1,"name":"Ada"}]',
    format: 'csv',
    direction: 'forward',
    optionsByFormat: {},
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.classList.remove('dark');
});

describe('axe-core scan', () => {
  it('reports real violations (guards against a scan that checks nothing)', async () => {
    render(
      <main>
        <button type="button">
          <svg aria-hidden="true" />
        </button>
      </main>,
    );
    // This bare render also lacks a <title>; the app pages always have one.
    expect(await axeViolations()).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^button-name \(critical\)/),
        expect.stringMatching(/^document-title/),
      ]),
    );
  });

  it('finds no violations on the converter page', async () => {
    renderApp('/');
    const editor = await findInputEditor();
    expect(editor).toHaveAccessibleDescription(/To leave the editor, press Escape, then Tab/);
    expect(await axeViolations()).toEqual([]);
  });

  it('finds no violations while the input does not parse', async () => {
    useWorkspaceStore.setState({ input: '{"broken": ' });
    renderApp('/');
    const editor = await findInputEditor();
    await waitFor(() => expect(editor).toHaveAttribute('aria-invalid', 'true'));
    expect(await axeViolations()).toEqual([]);
  });

  it.each([
    ['/about', 'About JSONPrism'],
    ['/no/such/page', 'Page not found'],
    ['/error/403', 'Forbidden'],
  ])('finds no violations on %s', async (path, heading) => {
    renderApp(path);
    await screen.findByRole('heading', { level: 1, name: heading });
    expect(await axeViolations()).toEqual([]);
  });

  it('finds no violations with the consent gate open', async () => {
    useConsentStore.setState({ accepted: false });
    renderApp('/');
    await screen.findByRole('dialog', { name: 'Before you start' });
    expect(await axeViolations()).toEqual([]);
  });

  it.each([
    ['Options', /options/i],
    ['Batch', /batch/i],
    [/Target format/, /Target format/],
  ])('finds no violations with the %s sheet open', async (trigger, dialogName) => {
    const user = renderApp('/');
    await findInputEditor();
    await user.click(screen.getByRole('button', { name: trigger }));
    const dialog = await screen.findByRole('dialog', { name: dialogName });
    expect(dialog).toHaveAccessibleDescription();
    expect(await axeViolations()).toEqual([]);
  });
});

describe('focus management', () => {
  it('starts with a skip link that moves focus to the main content', async () => {
    const user = renderApp('/about');
    await screen.findByRole('heading', { level: 1, name: 'About JSONPrism' });

    await user.tab();
    const skip = screen.getByRole('link', { name: 'Skip to content' });
    expect(skip).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('main')).toHaveFocus();

    // The next Tab continues inside the page, not back in the header.
    await user.tab();
    expect(
      within(screen.getByRole('main')).getByRole('region', { name: 'About JSONPrism' }),
    ).toHaveFocus();
  });

  it('moves focus to the main content after navigating', async () => {
    const user = renderApp('/about');
    await screen.findByRole('heading', { level: 1, name: 'About JSONPrism' });
    await user.click(screen.getByRole('link', { name: 'Convert' }));
    await findInputEditor();
    expect(screen.getByRole('main')).toHaveFocus();
  });

  it('continues in the main content once the consent gate closes', async () => {
    useConsentStore.setState({ accepted: false });
    const user = renderApp('/about');
    await screen.findByRole('dialog', { name: 'Before you start' });

    await user.click(screen.getByRole('checkbox', { name: /I have read and agree/ }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus());
  });
});
