import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import path from 'node:path';
import pkg from './package.json';

// Tauri exposes env vars during dev/build; presence indicates a Tauri context.
const isTauriContext = !!process.env.TAURI_ENV_PLATFORM;
const tauriHost = process.env.TAURI_DEV_HOST;

// Resolve commit SHA + build date once per Vite config load. The About page
// surfaces these so a deployed build can be traced back to its source.
function safeGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}
const appCommit = safeGitSha();
const appBuildDate = new Date().toISOString().slice(0, 10);

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Web prod build deploys to /jsonPrism/ (GH Pages mirrors the repo name
  // case). Tauri bundles serve from '/'.
  base: isTauriContext ? '/' : mode === 'production' ? '/jsonPrism/' : '/',

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __IS_TAURI_BUILD__: JSON.stringify(isTauriContext),
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_BUILD_DATE__: JSON.stringify(appBuildDate),
  },

  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Tauri docs recommend not clearing the screen so Cargo/Tauri logs survive.
  clearScreen: !isTauriContext,

  build: {
    target: 'es2022',
    sourcemap: !isTauriContext,
    // Vite 8 uses Rolldown + Oxc minifier by default; legacy `esbuild` requires
    // installing esbuild separately.
    minify: 'oxc',
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown only accepts the function form here. Split into the
        // smallest sensible vendor chunks so a stale deploy only re-downloads
        // the pieces that actually changed, and so heavy parsers/lang-packs are
        // their own files (loaded lazily once their format/editor is needed).
        // Clause order matters: react must win before react-router/react-i18next.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // React core (react, react-dom, scheduler) — exclude react-router /
          // react-i18next / @uiw/react-codemirror which match their own clauses.
          if (id.includes('/react-dom/') || /\/react\//.test(id) || id.includes('/scheduler/')) {
            return 'react';
          }
          if (id.includes('react-router')) return 'router';
          if (id.includes('i18next')) return 'i18n';
          // CodeMirror: language packs split from the core editor.
          if (id.includes('@codemirror/lang-') || id.includes('@codemirror/legacy-modes')) {
            return 'cm-langs';
          }
          if (
            id.includes('@codemirror/') ||
            id.includes('@uiw/react-codemirror') ||
            id.includes('@lezer/')
          ) {
            return 'cm-core';
          }
          // One chunk per parser library.
          if (id.includes('js-yaml')) return 'p-yaml';
          if (id.includes('papaparse')) return 'p-csv';
          if (id.includes('fast-xml-parser')) return 'p-xml';
          if (id.includes('smol-toml')) return 'p-toml';
          if (id.includes('node_modules/bson/')) return 'p-bson';
          if (id.includes('node_modules/cbor-x/')) return 'p-cbor';
          if (id.includes('node_modules/@msgpack/')) return 'p-msgpack';
          if (id.includes('fflate')) return 'fflate';
          // Radix primitives + icon set.
          if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'ui';
          return undefined;
        },
      },
    },
  },

  server: {
    port: 5173,
    strictPort: isTauriContext,
    host: tauriHost ?? false,
    hmr: tauriHost
      ? { protocol: 'ws', host: tauriHost, port: 1421 }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  // Don't accidentally bundle Tauri-only modules into the web build.
  // The runtime check in src/lib/tauri.ts handles this at call time,
  // but we also externalize so missing modules don't fail the web build.
  optimizeDeps: {
    exclude: isTauriContext
      ? []
      : [
          '@tauri-apps/api',
          '@tauri-apps/plugin-dialog',
          '@tauri-apps/plugin-fs',
          '@tauri-apps/plugin-os',
          '@tauri-apps/plugin-shell',
        ],
  },
}));
