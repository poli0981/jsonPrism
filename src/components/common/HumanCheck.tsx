import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react';
import { createLogger } from '@/lib/logger';
import { useTheme } from '@/lib/theme';
import {
  TURNSTILE_ACTION,
  turnstileLanguage,
  turnstileSiteKey,
  verifyToken,
} from '@/lib/turnstile';
import { useConsentStore } from '@/stores/consentStore';

const log = createLogger('turnstile');

type CheckState = 'loading' | 'verifying' | 'verified' | 'rejected' | 'unavailable';

/** If the widget neither solves nor errors in this time, offer the fallback. */
const WIDGET_TIMEOUT_MS = 20_000;

/**
 * Cloudflare Turnstile check for the web build, verified server-side by the
 * Worker (`/api/turnstile/verify`). A rejected token keeps the gate closed; an
 * unreachable Cloudflare (offline, blocked script, 5xx) lets the user continue
 * after a warning, because conversion itself never needs the network.
 */
export function HumanCheck() {
  const { t, i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const markHumanVerified = useConsentStore((s) => s.markHumanVerified);
  const allowUnverified = useConsentStore((s) => s.allowUnverified);
  const widgetRef = useRef<TurnstileInstance | undefined>(undefined);
  const [state, setState] = useState<CheckState>('loading');

  useEffect(() => {
    if (state !== 'loading') return;
    const timer = setTimeout(() => setState('unavailable'), WIDGET_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const onSuccess = useCallback(
    (token: string) => {
      setState('verifying');
      void verifyToken(token).then((result) => {
        if (result.status === 'verified') {
          setState('verified');
          markHumanVerified(result.verifiedUntil);
        } else if (result.status === 'rejected') {
          log.warn('Turnstile token rejected:', result.codes.join(', ') || 'no codes');
          setState('rejected');
          widgetRef.current?.reset();
        } else {
          log.warn('Turnstile verification unavailable:', result.reason);
          setState('unavailable');
        }
      });
    },
    [markHumanVerified],
  );

  const onWidgetError = useCallback((code?: string) => {
    log.warn('Turnstile widget error:', code ?? 'unknown');
    setState('unavailable');
  }, []);

  return (
    <div className="border-border bg-muted/40 flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
        {state === 'verified' ? (
          <ShieldCheck className="text-success motion-safe:animate-pop h-4 w-4" aria-hidden />
        ) : state === 'unavailable' || state === 'rejected' ? (
          <TriangleAlert className="text-warning h-4 w-4" aria-hidden />
        ) : (
          <LoaderCircle className="text-primary h-4 w-4 motion-safe:animate-spin" aria-hidden />
        )}
        <span>{t(`human_check.${state}`)}</span>
      </div>
      {state !== 'verified' && state !== 'unavailable' && (
        <Turnstile
          ref={widgetRef}
          siteKey={turnstileSiteKey()}
          options={{
            action: TURNSTILE_ACTION,
            theme: resolvedTheme,
            language: turnstileLanguage(i18n.resolvedLanguage),
            size: 'flexible',
            refreshExpired: 'auto',
          }}
          scriptOptions={{ onError: () => onWidgetError('script-load-failed') }}
          onSuccess={onSuccess}
          onError={onWidgetError}
          onExpire={() => widgetRef.current?.reset()}
          onUnsupported={() => onWidgetError('unsupported-browser')}
        />
      )}
      {state === 'unavailable' && (
        <div className="flex flex-col gap-2 text-xs">
          <p className="text-muted-foreground">{t('human_check.unavailable_hint')}</p>
          <button
            type="button"
            onClick={allowUnverified}
            className="border-border hover:bg-muted min-h-8 self-start rounded-md border px-3 font-medium"
          >
            {t('human_check.continue_anyway')}
          </button>
        </div>
      )}
    </div>
  );
}
