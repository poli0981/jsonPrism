import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExternalLinkInterceptor } from '@/hooks/useExternalLinkInterceptor';

const opener = vi.hoisted(() => ({ openUrl: vi.fn() }));
vi.mock('@tauri-apps/plugin-opener', () => opener);

type TauriWindow = Window & { __TAURI_INTERNALS__?: unknown };

function enterTauri(): void {
  vi.stubGlobal('__IS_TAURI_BUILD__', true);
  (window as TauriWindow).__TAURI_INTERNALS__ = {};
}

/** Whether the click reached the window with its default action cancelled. */
let lastDefaultPrevented: boolean | null = null;
// Runs after the hook's document listener; also stops jsdom from navigating.
const recordAndSwallow = (event: MouseEvent) => {
  lastDefaultPrevented = event.defaultPrevented;
  event.preventDefault();
};

const created: Element[] = [];

function attach<T extends Element>(element: T): T {
  document.body.appendChild(element);
  created.push(element);
  return element;
}

function link(href: string | null, text = 'Docs'): HTMLAnchorElement {
  const anchor = document.createElement('a');
  if (href !== null) anchor.setAttribute('href', href);
  anchor.textContent = text;
  return attach(anchor);
}

function click(target: Element, init: MouseEventInit = {}): void {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
}

beforeEach(() => {
  lastDefaultPrevented = null;
  opener.openUrl.mockResolvedValue(undefined);
  window.addEventListener('click', recordAndSwallow);
});

afterEach(() => {
  window.removeEventListener('click', recordAndSwallow);
  vi.unstubAllGlobals();
  delete (window as TauriWindow).__TAURI_INTERNALS__;
  for (const element of created.splice(0)) element.remove();
});

describe('useExternalLinkInterceptor', () => {
  it('leaves links alone in the web build', async () => {
    renderHook(() => useExternalLinkInterceptor());

    click(link('https://example.com/'));

    expect(lastDefaultPrevented).toBe(false);
    await Promise.resolve();
    expect(opener.openUrl).not.toHaveBeenCalled();
  });

  it('opens external links in the system browser inside Tauri', async () => {
    enterTauri();
    renderHook(() => useExternalLinkInterceptor());

    click(link('https://github.com/poli0981/jsonPrism'));

    expect(lastDefaultPrevented).toBe(true);
    await vi.waitFor(() =>
      expect(opener.openUrl).toHaveBeenCalledWith('https://github.com/poli0981/jsonPrism'),
    );
  });

  it('catches clicks on elements nested inside the link', async () => {
    enterTauri();
    renderHook(() => useExternalLinkInterceptor());
    const anchor = link('HTTP://EXAMPLE.COM/upper', '');
    const icon = document.createElement('span');
    anchor.appendChild(icon);

    click(icon);

    expect(lastDefaultPrevented).toBe(true);
    await vi.waitFor(() => expect(opener.openUrl).toHaveBeenCalledWith('HTTP://EXAMPLE.COM/upper'));
  });

  it.each([
    ['an in-app route', '/about'],
    ['a hash link', '#faq'],
    ['a mail link', 'mailto:support@poli0981.dev'],
    ['an empty href', ''],
  ])('ignores %s', async (_label, href) => {
    enterTauri();
    renderHook(() => useExternalLinkInterceptor());

    click(link(href));

    expect(lastDefaultPrevented).toBe(false);
    await Promise.resolve();
    expect(opener.openUrl).not.toHaveBeenCalled();
  });

  it('ignores anchors without an href and clicks outside any link', async () => {
    enterTauri();
    renderHook(() => useExternalLinkInterceptor());
    const button = attach(document.createElement('button'));

    click(link(null));
    expect(lastDefaultPrevented).toBe(false);
    click(button);
    expect(lastDefaultPrevented).toBe(false);

    await Promise.resolve();
    expect(opener.openUrl).not.toHaveBeenCalled();
  });

  it('ignores non-primary buttons', async () => {
    enterTauri();
    renderHook(() => useExternalLinkInterceptor());

    click(link('https://example.com/'), { button: 1 });

    expect(lastDefaultPrevented).toBe(false);
    await Promise.resolve();
    expect(opener.openUrl).not.toHaveBeenCalled();
  });

  it('respects clicks another handler already took care of', async () => {
    enterTauri();
    renderHook(() => useExternalLinkInterceptor());
    const anchor = link('https://example.com/');
    anchor.addEventListener('click', (event) => event.preventDefault());

    click(anchor);

    await Promise.resolve();
    expect(opener.openUrl).not.toHaveBeenCalled();
  });

  it('stops intercepting after unmount', async () => {
    enterTauri();
    const { unmount } = renderHook(() => useExternalLinkInterceptor());
    unmount();

    click(link('https://example.com/'));

    expect(lastDefaultPrevented).toBe(false);
    await Promise.resolve();
    expect(opener.openUrl).not.toHaveBeenCalled();
  });
});
