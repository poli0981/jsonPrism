/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __IS_TAURI_BUILD__: boolean;
declare const __IS_ANDROID_BUILD__: boolean;
/** Build-time Tauri target (windows | darwin | linux | android | ios), or "web". */
declare const __TAURI_PLATFORM__: string;
declare const __APP_COMMIT__: string;
declare const __APP_BUILD_DATE__: string;

interface ImportMetaEnv {
  /** Overrides the Turnstile sitekey (e.g. a staging widget). */
  readonly VITE_TURNSTILE_SITE_KEY?: string;
  /** Set to "1" to exercise the Turnstile gate under `npm run dev`. */
  readonly VITE_TURNSTILE_DEV?: string;
}
