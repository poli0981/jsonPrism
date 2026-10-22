import { create } from 'zustand';
import { CONSENT_VERSION, isConsentValid, loadConsent, saveConsent } from '@/lib/consent-storage';
import { isHumanCheckValid, loadHumanCheck, saveHumanCheck } from '@/lib/human-check-storage';
import { isTurnstileEnabled } from '@/lib/turnstile';

interface ConsentState {
  accepted: boolean;
  /** Web only: a recent Turnstile check passed (always true where Turnstile is off). */
  humanVerified: boolean;
  accept(): void;
  markHumanVerified(verifiedUntil: number): void;
  /** Let the user in when verification infrastructure is unreachable (not persisted). */
  allowUnverified(): void;
}

function initialAccepted(): boolean {
  // The Windows installers (NSIS/MSI) show license.rtf and require acceptance,
  // so the in-app gate would be redundant there. macOS (.dmg/.app), Linux
  // (.deb/.rpm/AppImage) and the Android APK have no license step, so they show
  // the gate like the web build.
  if (__IS_TAURI_BUILD__ && __TAURI_PLATFORM__ === 'windows') return true;
  return isConsentValid(loadConsent());
}

function initialHumanVerified(): boolean {
  return !isTurnstileEnabled() || isHumanCheckValid(loadHumanCheck());
}

export const useConsentStore = create<ConsentState>((set) => ({
  accepted: initialAccepted(),
  humanVerified: initialHumanVerified(),
  accept: () => {
    saveConsent({ accepted: true, version: CONSENT_VERSION, acceptedAt: Date.now() });
    set({ accepted: true });
  },
  markHumanVerified: (verifiedUntil) => {
    saveHumanCheck(verifiedUntil);
    set({ humanVerified: true });
  },
  allowUnverified: () => set({ humanVerified: true }),
}));
