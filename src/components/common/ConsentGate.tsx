import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HumanCheck } from '@/components/common/HumanCheck';
import { legalDocUrl } from '@/lib/links';
import { isTurnstileEnabled } from '@/lib/turnstile';
import { useConsentStore } from '@/stores/consentStore';

const LEGAL_DOCS = [
  { key: 'license', file: 'LICENSE' },
  { key: 'terms', file: 'TERMS.md' },
  { key: 'privacy', file: 'PRIVACY.md' },
  { key: 'disclaimer', file: 'DISCLAIMER.md' },
] as const;

/**
 * First-launch legal gate. Blocks the app behind a non-dismissible modal until
 * the user accepts; on the web build it also runs the Cloudflare Turnstile
 * human check (re-run alone every 7 days for returning visitors).
 *
 * The app renders behind the modal (inert) so the page has real content for
 * search engines and context for the user. Windows desktop builds skip the
 * gate — their installer's license page already required acceptance.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const accepted = useConsentStore((s) => s.accepted);
  const humanVerified = useConsentStore((s) => s.humanVerified);
  const gated = !accepted || !humanVerified;

  // One stable wrapper, so passing the gate doesn't remount the whole app.
  return (
    <>
      <div inert={gated} aria-hidden={gated || undefined} className={gated ? 'h-dvh' : 'contents'}>
        {children}
      </div>
      {gated && (
        <Dialog open>
          <DialogContent
            showCloseButton={false}
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            className="max-w-md"
          >
            {/* Tauri builds never run the human check, so the bundler drops it there. */}
            {accepted && !__IS_TAURI_BUILD__ ? (
              <RecheckForm />
            ) : (
              <ConsentForm humanVerified={humanVerified} />
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function ConsentForm({ humanVerified }: { humanVerified: boolean }) {
  const { t } = useTranslation();
  const accept = useConsentStore((s) => s.accept);
  const [checked, setChecked] = useState(false);
  // Decided once, so a passed check stays visible (and announced) instead of vanishing.
  const [needsCheck] = useState(() => isTurnstileEnabled() && !humanVerified);
  const web = !__IS_TAURI_BUILD__;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('consent.title')}</DialogTitle>
        <DialogDescription>{t('consent.intro')}</DialogDescription>
      </DialogHeader>

      {web && <p className="text-muted-foreground text-sm">{t('consent.web_services')}</p>}

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {LEGAL_DOCS.map((doc) => (
          <li key={doc.key}>
            <a
              href={legalDocUrl(doc.file)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary inline-flex min-h-8 items-center gap-1 underline-offset-4 hover:underline"
            >
              {t(`consent.links.${doc.key}`)}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          </li>
        ))}
      </ul>

      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="accent-primary mt-0.5 h-4 w-4 shrink-0"
        />
        <span>{t('consent.agree')}</span>
      </label>

      {!__IS_TAURI_BUILD__ && needsCheck && <HumanCheck />}

      <button
        type="button"
        disabled={!checked || !humanVerified}
        onClick={accept}
        className="bg-primary text-primary-foreground min-h-10 rounded-md px-4 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t('consent.continue')}
      </button>
    </>
  );
}

/** Returning visitor whose 7-day human check expired: just the check. */
function RecheckForm() {
  const { t } = useTranslation();
  return (
    <>
      <DialogHeader>
        <DialogTitle>{t('human_check.title')}</DialogTitle>
        <DialogDescription>{t('human_check.recheck_intro')}</DialogDescription>
      </DialogHeader>
      <HumanCheck />
    </>
  );
}
