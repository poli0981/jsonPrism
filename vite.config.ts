import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// Tauri exposes env vars during dev/build; presence indicates a Tauri context.
const isTauriContext = !!process.env.TAURI_ENV_PLATFORM;
const tauriHost = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Web prod build deploys to /jsonprism/. Tauri bundles serve from '/'.
  base: isTauriContext ? '/' : mode === 'production' ? '/jsonprism/' : '/',

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
    // Tauri uses Chromium/WebKit only — drop legacy fallbacks for smaller bundles.
    minify: isTauriContext ? 'esbuild' : 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          codemirror: [
            '@codemirror/state',
            '@codemirror/view',
            '@codemirror/lang-json',
            '@uiw/react-codemirror',
          ],
          parsers: ['js-yaml', 'smol-toml', 'fast-xml-parser', 'papaparse'],
          fflate: ['fflate'],
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
