import { create } from 'zustand';
import { CONSENT_VERSION, isConsentValid, loadConsent, saveConsent } from '@/lib/consent-storage';

interface ConsentState {
  accepted: boolean;
  accept(): void;
}

function initialAccepted(): boolean {
  // Desktop builds gate acceptance through the installer's license page, so the
  // in-app web gate is a no-op there.
  if (__IS_TAURI_BUILD__) return true;
  return isConsentValid(loadConsent());
}

export const useConsentStore = create<ConsentState>((set) => ({
  accepted: initialAccepted(),
  accept: () => {
    saveConsent({ accepted: true, version: CONSENT_VERSION, acceptedAt: Date.now() });
    set({ accepted: true });
  },
}));
