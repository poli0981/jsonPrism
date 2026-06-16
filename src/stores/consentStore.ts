import { create } from 'zustand';
import { CONSENT_VERSION, isConsentValid, loadConsent, saveConsent } from '@/lib/consent-storage';

interface ConsentState {
  accepted: boolean;
  accept(): void;
}

function initialAccepted(): boolean {
  // Desktop installers gate acceptance through their license page, so the in-app
  // gate is a no-op there. The Android sideload APK has no installer license
  // step, so it must show the gate just like the web build.
  if (__IS_TAURI_BUILD__ && !__IS_ANDROID_BUILD__) return true;
  return isConsentValid(loadConsent());
}

export const useConsentStore = create<ConsentState>((set) => ({
  accepted: initialAccepted(),
  accept: () => {
    saveConsent({ accepted: true, version: CONSENT_VERSION, acceptedAt: Date.now() });
    set({ accepted: true });
  },
}));
