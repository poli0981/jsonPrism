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
import { useConsentStore } from '@/stores/consentStore';

const REPO_URL = 'https://github.com/poli0981/jsonPrism';

const LEGAL_LINKS = [
  { key: 'license', href: `${REPO_URL}/blob/main/LICENSE` },
  { key: 'terms', href: `${REPO_URL}/blob/main/TERMS.md` },
  { key: 'privacy', href: `${REPO_URL}/blob/main/PRIVACY.md` },
  { key: 'disclaimer', href: `${REPO_URL}/blob/main/DISCLAIMER.md` },
] as const;

/**
 * First-launch legal gate (web + Android). Blocks the app behind a
 * non-dismissible modal until the user accepts. On desktop the store seeds
 * `accepted = true` (the installer's license page already gated acceptance), so
 * this renders its children straight through; the Android sideload APK has no
 * such installer step, so it shows the gate like the web build.
 */
export function ConsentGate({ children }: { children: ReactNode }) {
  const accepted = useConsentStore((s) => s.accepted);
  const accept = useConsentStore((s) => s.accept);
  const { t } = useTranslation();
  const [checked, setChecked] = useState(false);

  if (accepted) return <>{children}</>;

  return (
    <div className="bg-background h-dvh w-full">
      <Dialog open>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="max-w-md"
        >
          <DialogHeader>
            <DialogTitle>{t('consent.title')}</DialogTitle>
            <DialogDescription>{t('consent.intro')}</DialogDescription>
          </DialogHeader>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {LEGAL_LINKS.map((l) => (
              <li key={l.key}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 underline-offset-4 hover:underline"
                >
                  {t(`consent.links.${l.key}`)}
                  <ExternalLink className="h-3 w-3" />
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

          <button
            type="button"
            disabled={!checked}
            onClick={accept}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('consent.continue')}
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
