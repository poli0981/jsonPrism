import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { execSync } from 'node:child_process';
import path from 'node:path';
import pkg from './package.json';

// Tauri exposes env vars during dev/build; presence indicates a Tauri context.
const isTauriContext = !!process.env.TAURI_ENV_PLATFORM;
// `android` during `tauri android build`. The Android sideload APK has no
// installer license page, so it must show the in-app consent gate (web does).
const isAndroidBuild = process.env.TAURI_ENV_PLATFORM === 'android';
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
    __IS_ANDROID_BUILD__: JSON.stringify(isAndroidBuild),
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
    // Source maps would expose full original source on the public GH Pages
    // deploy (the whole dist/ is uploaded), and nothing consumes them
    // (PRIVACY.md: no remote error reporting). Emit them only for local,
    // non-production web builds; never for the prod web deploy or Tauri.
    sourcemap: !isTauriContext && mode !== 'production',
    // Vite 8 uses Rolldown + Oxc minifier by default; legacy `esbuild` requires
    // installing esbuild separately.
    minify: 'oxc',
    rollupOptions: {
      output: {
        // Rolldown deprecates the `manualChunks` function form — its optimizer
        // silently merges small manual chunks back together (it folded a
        // `@codemirror/view` split straight back into `cm-core`).
        // `advancedChunks.groups` are explicit, honored boundaries; higher
        // `priority` wins when a module matches several groups.
        //
        // CodeMirror gotcha: a group captures its matched modules AND their deps
        // recursively, so the leaf groups (`cm-kit`, `cm-langs`) would otherwise
        // drag the shared core (view/state/language) in with them — that ballooned
        // `cm-langs` to ~600 kB. Fix: give `cm-core` the highest cm priority so it
        // claims the shared modules first, scope each cm test so it can't match
        // another's packages, and put a `maxSize` on `cm-core` so Rolldown peels
        // the heavy `@codemirror/view` engine into its own file. Net: every chunk
        // stays under the 500 kB warning, the pieces still load together behind
        // the editor's lazy boundary (same total bytes), and a stale deploy
        // re-downloads only the part that moved.
        advancedChunks: {
          groups: [
            // React core (react, react-dom, scheduler) — `[\\/]react[\\/]`
            // excludes react-router / react-i18next / @uiw/react-codemirror.
            { name: 'react', priority: 100, test: /[\\/](?:react-dom|react|scheduler)[\\/]/ },
            { name: 'router', priority: 95, test: /react-router/ },
            { name: 'i18n', priority: 95, test: /i18next/ },
            // `@codemirror/view` is the ~370 kB DOM/render engine — the single
            // heaviest module and the reason the old `cm-core` tripped 500 kB.
            // Pin it (highest cm priority) so nothing drags it elsewhere.
            { name: 'cm-view', priority: 93, test: /@codemirror[\\/]view[\\/]/ },
            // The rest of the core: state + language + lezer + the @uiw wrapper
            // (whose recursive deps also pull in autocomplete/commands/search/lint).
            // Outranks cm-langs so the lang packs' dep capture can't steal it.
            {
              name: 'cm-core',
              priority: 92,
              test: /@codemirror[\\/](?:state|language|theme-|autocomplete|commands|search|lint)|@lezer[\\/]|@uiw[\\/]react-codemirror/,
            },
            { name: 'cm-langs', priority: 90, test: /@codemirror[\\/](?:lang-|legacy-modes)/ },
            // One chunk per parser library.
            { name: 'p-yaml', priority: 70, test: /js-yaml/ },
            { name: 'p-csv', priority: 70, test: /papaparse/ },
            { name: 'p-xml', priority: 70, test: /fast-xml-parser/ },
            { name: 'p-toml', priority: 70, test: /smol-toml/ },
            { name: 'p-bson', priority: 70, test: /node_modules[\\/]bson[\\/]/ },
            { name: 'p-cbor', priority: 70, test: /node_modules[\\/]cbor-x[\\/]/ },
            { name: 'p-msgpack', priority: 70, test: /node_modules[\\/]@msgpack[\\/]/ },
            { name: 'fflate', priority: 70, test: /fflate/ },
            // Radix primitives + icon set.
            { name: 'ui', priority: 60, test: /(?:@radix-ui|lucide-react)/ },
          ],
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
          '@tauri-apps/plugin-opener',
          '@tauri-apps/plugin-os',
        ],
  },
}));
