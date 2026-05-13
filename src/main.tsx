import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/globals.css';
import './i18n';
import { App } from './app/App';

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found in index.html');
}

// Tauri serves the bundle from `tauri://localhost/` regardless of the web
// deploy path. Web prod ships at `/jsonPrism/` on GitHub Pages (path mirrors
// the repo name case). The split is build-time, so use a Vite `define`
// flag instead of `isTauri()` runtime (which is false at module load before
// Tauri injects __TAURI__).
const basename = __IS_TAURI_BUILD__ ? '/' : import.meta.env.PROD ? '/jsonPrism' : '/';

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
