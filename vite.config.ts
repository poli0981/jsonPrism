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
  // Web prod build deploys to /jsonprism/. Tauri bundles serve from '/'.
  base: isTauriContext ? '/' : mode === 'production' ? '/jsonprism/' : '/',

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
        // Vite 8 / Rolldown only accepts the function form here.
        manualChunks(id) {
          if (
            id.includes('@codemirror/') ||
            id.includes('@uiw/react-codemirror') ||
            id.includes('@lezer/')
          ) {
            return 'codemirror';
          }
          if (
            id.includes('js-yaml') ||
            id.includes('smol-toml') ||
            id.includes('fast-xml-parser') ||
            id.includes('papaparse')
          ) {
            return 'parsers';
          }
          if (
            id.includes('node_modules/bson/') ||
            id.includes('node_modules/cbor-x/') ||
            id.includes('node_modules/@msgpack/')
          ) {
            return 'binary-parsers';
          }
          if (id.includes('fflate')) return 'fflate';
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
