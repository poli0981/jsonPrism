import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLayoutEffect, useRef } from 'react';
import '@/i18n';
import { ScrollToTop } from '../ScrollToTop';

/** jsdom ships without matchMedia; only the reduced-motion query matters here. */
function stubReducedMotion(reduce: boolean) {
  const matchMedia = vi.fn((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
  }));
  vi.stubGlobal('matchMedia', matchMedia);
  return matchMedia;
}

function ScrollArea({
  threshold,
  initialScroll = 0,
}: {
  threshold?: number;
  initialScroll?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Runs before ScrollToTop's passive effect reads the initial position.
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = initialScroll;
  }, [initialScroll]);
  return (
    <div>
      <div ref={ref} data-testid="scroller" />
      <ScrollToTop scrollRef={ref} {...(threshold !== undefined ? { threshold } : {})} />
    </div>
  );
}

function scrollTo(el: HTMLElement, top: number) {
  el.scrollTop = top;
  fireEvent.scroll(el);
}

// aria-hidden elements have no accessible name, so find the hidden button by its tooltip.
const hiddenButton = () => screen.getByTitle('Back to top');

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ScrollToTop', () => {
  it('stays hidden and out of the tab order near the top', () => {
    render(<ScrollArea />);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
    expect(hiddenButton()).toHaveAttribute('aria-hidden', 'true');
    expect(hiddenButton()).toHaveAttribute('tabindex', '-1');
    expect(hiddenButton()).toHaveAttribute('aria-label', 'Back to top');
  });

  it('appears after scrolling past the default threshold and hides again near the top', () => {
    render(<ScrollArea />);
    const scroller = screen.getByTestId('scroller');

    scrollTo(scroller, 320);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();

    scrollTo(scroller, 321);
    const button = screen.getByRole('button', { name: 'Back to top' });
    expect(button).toHaveAttribute('tabindex', '0');
    expect(button).toHaveAttribute('aria-hidden', 'false');

    scrollTo(scroller, 10);
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
  });

  it('honours a custom threshold', () => {
    render(<ScrollArea threshold={50} />);
    scrollTo(screen.getByTestId('scroller'), 60);
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
  });

  it('checks the position on mount', () => {
    render(<ScrollArea initialScroll={1000} />);
    expect(screen.getByRole('button', { name: 'Back to top' })).toBeInTheDocument();
  });

  it.each([
    [false, 'smooth'],
    [true, 'auto'],
  ])('scrolls back to the top (reduced motion: %s → %s)', async (reduce, behavior) => {
    const user = userEvent.setup();
    stubReducedMotion(reduce);
    render(<ScrollArea initialScroll={1000} />);
    const scroller = screen.getByTestId('scroller');
    const scroll = vi.fn();
    Object.defineProperty(scroller, 'scrollTo', { configurable: true, value: scroll });

    await user.click(screen.getByRole('button', { name: 'Back to top' }));
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior });
  });

  it('does nothing without a scroll container', async () => {
    const user = userEvent.setup();
    const matchMedia = stubReducedMotion(false);
    render(<ScrollToTop scrollRef={{ current: null }} />);
    await user.click(hiddenButton());
    expect(matchMedia).not.toHaveBeenCalled();
    expect(hiddenButton()).toHaveAttribute('aria-hidden', 'true');
  });

  it('stops listening to the container when unmounted', () => {
    const { unmount } = render(<ScrollArea />);
    const scroller = screen.getByTestId('scroller');
    const remove = vi.spyOn(scroller, 'removeEventListener');
    unmount();
    expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
  });
});
