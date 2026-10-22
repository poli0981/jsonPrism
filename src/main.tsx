import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
// Self-hosted fonts (bundled into the build) so the app renders correctly
// offline — required for the desktop/Android builds and a privacy win for web.
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './styles/globals.css';
import './i18n';
import { installGlobalErrorHandlers } from './lib/logger';
import { applyPreferences, usePreferencesStore } from './stores/preferencesStore';
import { App } from './app/App';

installGlobalErrorHandlers();
// public/theme-init.js already applied these before first paint; this keeps
// the DOM in sync with the store from here on.
applyPreferences(usePreferencesStore.getState());

// A stale tab can reference chunks that a newer deploy removed. Reload once to
// pick up the new build; if that already happened recently, let the error
// boundary explain instead of looping.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'jsonprism.preloadReload';
  try {
    const last = Number(window.sessionStorage.getItem(key) ?? '0');
    if (Date.now() - last < 30_000) return;
    window.sessionStorage.setItem(key, String(Date.now()));
  } catch {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

// The web build is served from the domain root and Tauri from tauri://localhost/,
// so no router basename is needed.
createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
