import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useImperativeHandle, type Ref } from 'react';
import '@/i18n';
import { ConsentGate } from '../ConsentGate';
import { CONSENT_VERSION } from '@/lib/consent-storage';
import { ThemeProvider } from '@/lib/theme';
import { verifyToken } from '@/lib/turnstile';
import type * as TurnstileModule from '@/lib/turnstile';
import { useConsentStore } from '@/stores/consentStore';

const gate = vi.hoisted(() => ({ turnstile: false, reset: vi.fn() }));

vi.mock('@/lib/turnstile', async (importOriginal) => ({
  ...(await importOriginal<typeof TurnstileModule>()),
  isTurnstileEnabled: () => gate.turnstile,
  verifyToken: vi.fn(),
}));

interface FakeTurnstileProps {
  ref?: Ref<{ reset(): void } | undefined>;
  onSuccess?: (token: string) => void;
  onError?: (code?: string) => void;
}

// Stand-in for Cloudflare's widget: buttons fire the callbacks the real one would.
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile({ ref, onSuccess, onError }: FakeTurnstileProps) {
    useImperativeHandle(ref, () => ({ reset: gate.reset }));
    return (
      <div data-testid="turnstile">
        <button type="button" onClick={() => onSuccess?.('widget-token')}>
          solve
        </button>
        <button type="button" onClick={() => onError?.('network')}>
          widget error
        </button>
      </div>
    );
  },
}));

const appMounted = vi.fn();

function FakeApp() {
  useEffect(() => {
    appMounted();
  }, []);
  return (
    <div data-testid="app">
      <h1>Converter</h1>
      <button type="button">Convert now</button>
    </div>
  );
}

function renderGate() {
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <ConsentGate>
        <FakeApp />
      </ConsentGate>
    </ThemeProvider>,
  );
  return user;
}

const appWrapper = () => screen.getByTestId('app').parentElement;
const agreeBox = () => screen.getByRole('checkbox', { name: /I have read and agree/ });
const continueButton = () => screen.getByRole('button', { name: 'Continue' });

beforeEach(() => {
  gate.turnstile = false;
  useConsentStore.setState({ accepted: false, humanVerified: true });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ConsentGate', () => {
  it('shows the terms over the app, which renders behind it but stays unreachable', () => {
    renderGate();
    const dialog = screen.getByRole('dialog', { name: 'Before you start' });
    expect(dialog).toHaveAccessibleDescription(/converts everything on your device/);
    expect(within(dialog).getByText(/Cloudflare hosts the app/)).toBeInTheDocument();

    expect(screen.getByText('Converter')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Convert now' })).not.toBeInTheDocument();
    expect(appWrapper()).toHaveAttribute('inert');
    expect(appWrapper()).toHaveAttribute('aria-hidden', 'true');
  });

  it('links each legal document as of this build', () => {
    renderGate();
    const dialog = screen.getByRole('dialog');
    const docs = {
      License: 'LICENSE',
      'Terms (EULA)': 'TERMS.md',
      'Privacy Policy': 'PRIVACY.md',
      Disclaimer: 'DISCLAIMER.md',
    };
    for (const [name, file] of Object.entries(docs)) {
      const link = within(dialog).getByRole('link', { name });
      // Test builds have no commit hash, so links fall back to `main`.
      expect(link).toHaveAttribute(
        'href',
        `https://github.com/poli0981/jsonPrism/blob/main/${file}`,
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('enables Continue only while the terms are accepted, then opens the app in place', async () => {
    const user = renderGate();
    expect(continueButton()).toBeDisabled();

    await user.click(agreeBox());
    expect(continueButton()).toBeEnabled();
    await user.click(agreeBox());
    expect(continueButton()).toBeDisabled();

    await user.click(agreeBox());
    await user.click(continueButton());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useConsentStore.getState().accepted).toBe(true);
    expect(JSON.parse(window.localStorage.getItem('jsonprism.consent') as string)).toMatchObject({
      accepted: true,
      version: CONSENT_VERSION,
    });
    expect(screen.getByRole('button', { name: 'Convert now' })).toBeInTheDocument();
    expect(appWrapper()).not.toHaveAttribute('inert');
    expect(appWrapper()).not.toHaveAttribute('aria-hidden');
    expect(appWrapper()).toHaveClass('contents');
    // One stable wrapper: passing the gate must not remount the app.
    expect(appMounted).toHaveBeenCalledTimes(1);
  });

  it('cannot be dismissed with Escape or a click outside', async () => {
    renderGate();
    // Radix arms its outside-pointer listener on the next tick.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    fireEvent.keyDown(document.body, { key: 'Escape' });
    // A modal Radix dialog dismisses on the click that completes an outside press.
    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);
    fireEvent.focusIn(document.body);

    expect(screen.getByRole('dialog', { name: 'Before you start' })).toBeInTheDocument();
    expect(useConsentStore.getState().accepted).toBe(false);
  });

  it('requires a passed human check before Continue when Turnstile is on', async () => {
    gate.turnstile = true;
    useConsentStore.setState({ accepted: false, humanVerified: false });
    vi.mocked(verifyToken).mockResolvedValue({
      status: 'verified',
      verifiedUntil: Date.now() + 60_000,
    });
    const user = renderGate();

    await user.click(agreeBox());
    expect(continueButton()).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'solve' }));
    // The passed check stays visible (and announced) instead of vanishing.
    expect(await screen.findByText('Verified — thanks!')).toBeInTheDocument();
    expect(continueButton()).toBeEnabled();

    await user.click(continueButton());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useConsentStore.getState()).toMatchObject({ accepted: true, humanVerified: true });
  });

  it('lets the user continue without the check when it cannot run', async () => {
    gate.turnstile = true;
    useConsentStore.setState({ accepted: false, humanVerified: false });
    const user = renderGate();

    await user.click(screen.getByRole('button', { name: 'widget error' }));
    await user.click(screen.getByRole('button', { name: 'Continue without the check' }));
    await user.click(agreeBox());
    await user.click(continueButton());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('jsonprism.humanCheck')).toBeNull();
  });

  it('skips the human check when a recent one is remembered', () => {
    gate.turnstile = true;
    renderGate();
    expect(screen.getByRole('dialog', { name: 'Before you start' })).toBeInTheDocument();
    expect(screen.queryByTestId('turnstile')).not.toBeInTheDocument();
  });

  it('only re-runs the human check for returning visitors', async () => {
    gate.turnstile = true;
    useConsentStore.setState({ accepted: true, humanVerified: false });
    vi.mocked(verifyToken).mockResolvedValue({
      status: 'verified',
      verifiedUntil: Date.now() + 60_000,
    });
    const user = renderGate();

    const dialog = screen.getByRole('dialog', { name: 'Quick check' });
    expect(dialog).toHaveAccessibleDescription(/about once a week/);
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'solve' }));
    expect(await screen.findByRole('button', { name: 'Convert now' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays out of the way once consent and the check are in place', () => {
    useConsentStore.setState({ accepted: true, humanVerified: true });
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Convert now' })).toBeInTheDocument();
    expect(appWrapper()).not.toHaveAttribute('inert');
    expect(appWrapper()).toHaveClass('contents');
  });
});
