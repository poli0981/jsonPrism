import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useImperativeHandle, type Ref } from 'react';
import '@/i18n';
import { HumanCheck } from '../HumanCheck';
import { clearLogs, recentLogs } from '@/lib/logger';
import { ThemeProvider } from '@/lib/theme';
import { TEST_SITE_KEY, verifyToken, type VerifyResult } from '@/lib/turnstile';
import type * as TurnstileModule from '@/lib/turnstile';
import { useConsentStore } from '@/stores/consentStore';

const widget = vi.hoisted(() => ({ reset: vi.fn() }));

vi.mock('@/lib/turnstile', async (importOriginal) => ({
  ...(await importOriginal<typeof TurnstileModule>()),
  verifyToken: vi.fn(),
}));

interface FakeTurnstileProps {
  ref?: Ref<{ reset(): void } | undefined>;
  siteKey: string;
  options?: { action?: string; theme?: string; language?: string };
  scriptOptions?: { onError?: () => void };
  onSuccess?: (token: string) => void;
  onError?: (code?: string) => void;
  onExpire?: () => void;
  onUnsupported?: () => void;
}

// Stand-in for Cloudflare's widget: each button fires a callback the real one would.
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile({
    ref,
    siteKey,
    options,
    scriptOptions,
    onSuccess,
    onError,
    onExpire,
    onUnsupported,
  }: FakeTurnstileProps) {
    useImperativeHandle(ref, () => widget);
    return (
      <div
        data-testid="turnstile"
        data-sitekey={siteKey}
        data-action={options?.action}
        data-theme={options?.theme}
        data-language={options?.language}
      >
        <button type="button" onClick={() => onSuccess?.('widget-token')}>
          solve
        </button>
        <button type="button" onClick={() => onError?.('110200')}>
          widget error
        </button>
        <button type="button" onClick={() => onError?.()}>
          widget error without code
        </button>
        <button type="button" onClick={() => onUnsupported?.()}>
          unsupported browser
        </button>
        <button type="button" onClick={() => scriptOptions?.onError?.()}>
          script blocked
        </button>
        <button type="button" onClick={() => onExpire?.()}>
          expire
        </button>
      </div>
    );
  },
}));

const LOADING = "Checking that you're human…";
const UNAVAILABLE = 'The human check is unavailable right now.';

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function renderCheck() {
  return render(
    <ThemeProvider defaultTheme="light">
      <HumanCheck />
    </ThemeProvider>,
  );
}

const status = () => screen.getByRole('status');
const lastLog = () => recentLogs(1)[0]?.message;

beforeEach(() => {
  useConsentStore.setState({ accepted: false, humanVerified: false });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  clearLogs();
  vi.restoreAllMocks();
});

describe('HumanCheck', () => {
  it('renders the widget for the gate action in the current theme and language', () => {
    renderCheck();
    expect(status()).toHaveTextContent(LOADING);
    const turnstile = screen.getByTestId('turnstile');
    // jsdom runs on localhost, where Cloudflare's always-pass test key is used.
    expect(turnstile).toHaveAttribute('data-sitekey', TEST_SITE_KEY);
    expect(turnstile).toHaveAttribute('data-action', 'gate');
    expect(turnstile).toHaveAttribute('data-theme', 'light');
    expect(turnstile).toHaveAttribute('data-language', 'en');
  });

  it('verifies a solved challenge server-side, then opens and remembers the gate', async () => {
    const user = userEvent.setup();
    const pending = deferred<VerifyResult>();
    vi.mocked(verifyToken).mockReturnValue(pending.promise);
    renderCheck();

    await user.click(screen.getByRole('button', { name: 'solve' }));
    expect(verifyToken).toHaveBeenCalledWith('widget-token');
    expect(status()).toHaveTextContent('Verifying…');
    expect(useConsentStore.getState().humanVerified).toBe(false);

    const verifiedUntil = Date.now() + 60_000;
    await act(async () => {
      pending.resolve({ status: 'verified', verifiedUntil });
      await pending.promise;
    });
    expect(status()).toHaveTextContent('Verified — thanks!');
    expect(screen.queryByTestId('turnstile')).not.toBeInTheDocument();
    expect(useConsentStore.getState().humanVerified).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('jsonprism.humanCheck') as string)).toEqual({
      verifiedUntil,
    });
  });

  it.each([
    [
      ['invalid-input-response', 'timeout-or-duplicate'],
      'invalid-input-response, timeout-or-duplicate',
    ],
    [[], 'no codes'],
  ])(
    'keeps the gate closed and resets the widget on a rejected token (%j)',
    async (codes, logged) => {
      const user = userEvent.setup();
      vi.mocked(verifyToken).mockResolvedValue({ status: 'rejected', codes });
      renderCheck();

      await user.click(screen.getByRole('button', { name: 'solve' }));
      expect(
        await screen.findByText('Verification failed. Please try the check again.'),
      ).toBeInTheDocument();
      expect(widget.reset).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('turnstile')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /without the check/ })).not.toBeInTheDocument();
      expect(useConsentStore.getState().humanVerified).toBe(false);
      expect(lastLog()).toBe(`Turnstile token rejected: ${logged}`);
    },
  );

  it('offers to continue without the check when verification is unreachable', async () => {
    const user = userEvent.setup();
    vi.mocked(verifyToken).mockResolvedValue({ status: 'unavailable', reason: 'http-503' });
    renderCheck();

    await user.click(screen.getByRole('button', { name: 'solve' }));
    expect(await screen.findByText(UNAVAILABLE)).toBeInTheDocument();
    expect(screen.getByText(/JSONPrism converts on your device/)).toBeInTheDocument();
    expect(screen.queryByTestId('turnstile')).not.toBeInTheDocument();
    expect(lastLog()).toBe('Turnstile verification unavailable: http-503');

    await user.click(screen.getByRole('button', { name: 'Continue without the check' }));
    expect(useConsentStore.getState().humanVerified).toBe(true);
    // Not persisted: the next visit tries the check again.
    expect(window.localStorage.getItem('jsonprism.humanCheck')).toBeNull();
  });

  it.each([
    ['widget error', '110200'],
    ['widget error without code', 'unknown'],
    ['unsupported browser', 'unsupported-browser'],
    ['script blocked', 'script-load-failed'],
  ])('treats "%s" as the check being unavailable', async (button, code) => {
    const user = userEvent.setup();
    renderCheck();

    await user.click(screen.getByRole('button', { name: button }));
    expect(status()).toHaveTextContent(UNAVAILABLE);
    expect(screen.getByRole('button', { name: 'Continue without the check' })).toBeInTheDocument();
    expect(lastLog()).toBe(`Turnstile widget error: ${code}`);
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it('resets an expired token instead of failing the check', async () => {
    const user = userEvent.setup();
    renderCheck();

    await user.click(screen.getByRole('button', { name: 'expire' }));
    expect(widget.reset).toHaveBeenCalledTimes(1);
    expect(status()).toHaveTextContent(LOADING);
  });

  describe('widget timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('offers the fallback after 20 s without any widget response', () => {
      renderCheck();
      act(() => {
        vi.advanceTimersByTime(19_999);
      });
      expect(status()).toHaveTextContent(LOADING);

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(status()).toHaveTextContent(UNAVAILABLE);
      expect(screen.queryByTestId('turnstile')).not.toBeInTheDocument();
    });

    it('does not time out while a token is being verified', () => {
      vi.mocked(verifyToken).mockReturnValue(new Promise<VerifyResult>(() => {}));
      renderCheck();

      fireEvent.click(screen.getByRole('button', { name: 'solve' }));
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(status()).toHaveTextContent('Verifying…');
    });
  });
});
