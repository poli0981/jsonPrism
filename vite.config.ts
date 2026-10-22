import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import pkg from './package.json' with { type: 'json' };

// Tauri exposes env vars during dev/build; presence indicates a Tauri context.
// Values: windows | darwin | linux | android | ios.
const tauriPlatform = process.env.TAURI_ENV_PLATFORM;
const isTauriContext = !!tauriPlatform;
// The Android sideload APK has no installer license page, so it must show the
// in-app consent gate (web does too).
const isAndroidBuild = tauriPlatform === 'android';
const tauriHost = process.env.TAURI_DEV_HOST;

// Resolve the commit SHA once per config load without spawning `git` (no PATH
// lookup): CI-provided env first, then the .git files directly. The About page
// and the consent gate's legal links pin to this commit.
function resolveCommitSha(): string {
  const fromEnv = process.env.WORKERS_CI_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    let gitDir = path.resolve(import.meta.dirname, '.git');
    if (statSync(gitDir).isFile()) {
      // Worktree checkout: `.git` is a pointer file to the real git dir.
      const pointer = readFileSync(gitDir, 'utf8').trim().replace(/^gitdir:\s*/, '');
      gitDir = path.resolve(import.meta.dirname, pointer);
    }
    const head = readFileSync(path.join(gitDir, 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return head.slice(0, 7);
    const ref = head.slice('ref: '.length);
    // Worktrees keep branch refs in the shared ("common") git dir.
    const commonFile = path.join(gitDir, 'commondir');
    const commonDir = existsSync(commonFile)
      ? path.resolve(gitDir, readFileSync(commonFile, 'utf8').trim())
      : gitDir;
    for (const dir of [gitDir, commonDir]) {
      const refFile = path.join(dir, ref);
      if (existsSync(refFile)) return readFileSync(refFile, 'utf8').trim().slice(0, 7);
    }
    const packedRefs = path.join(commonDir, 'packed-refs');
    if (existsSync(packedRefs)) {
      const line = readFileSync(packedRefs, 'utf8')
        .split('\n')
        .find((l) => l.endsWith(` ${ref}`));
      if (line) return line.slice(0, 7);
    }
  } catch {
    // Not a git checkout (e.g. a source tarball) — fall through.
  }
  return 'dev';
}
const appCommit = resolveCommitSha();
const appBuildDate = new Date().toISOString().slice(0, 10);

/**
 * Stamps the build's commit into index.html (<meta name="jsonprism-commit">) so
 * the post-deploy smoke check can confirm production serves the merged commit.
 */
function buildMetaPlugin(): Plugin {
  return {
    name: 'jsonprism-build-meta',
    transformIndexHtml: () => [
      { tag: 'meta', attrs: { name: 'jsonprism-commit', content: appCommit }, injectTo: 'head' },
    ],
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // Web is served from the root of https://jsonprism.poli0981.dev (Cloudflare
  // Workers static assets); Tauri bundles serve from '/' as well.
  base: '/',

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __IS_TAURI_BUILD__: JSON.stringify(isTauriContext),
    __IS_ANDROID_BUILD__: JSON.stringify(isAndroidBuild),
    __TAURI_PLATFORM__: JSON.stringify(tauriPlatform ?? 'web'),
    __APP_COMMIT__: JSON.stringify(appCommit),
    __APP_BUILD_DATE__: JSON.stringify(appBuildDate),
  },

  plugins: [react(), tailwindcss(), buildMetaPlugin()],

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },

  // Tauri docs recommend not clearing the screen so Cargo/Tauri logs survive.
  clearScreen: !isTauriContext,

  // The conversion worker is bundled separately (it re-includes the parsers it
  // needs); ES output keeps it a module worker that can lazy-load chunks.
  worker: {
    format: 'es',
  },

  build: {
    // Default target ('baseline-widely-available': Chrome/Edge 111, Firefox 114,
    // Safari 16.4). Setting an ES year here would also raise the CSS target
    // (es2025 → Chrome 136 / Safari 26) and break the documented floors.
    // Source maps would expose full original source on the public deploy, and
    // nothing consumes them (PRIVACY.md: no remote error reporting). Emit them
    // only for local, non-production web builds; never for prod or Tauri.
    sourcemap: !isTauriContext && mode !== 'production',
    // Vite 8 uses Rolldown + Oxc minifier by default; legacy `esbuild` requires
    // installing esbuild separately.
    minify: 'oxc',
    rollupOptions: {
      output: {
        // Rolldown deprecates the `manualChunks` function form — its optimizer
        // silently merges small manual chunks back together (it folded a
        // `@codemirror/view` split straight back into `cm-core`).
        // `codeSplitting.groups` (formerly `advancedChunks`) are explicit, honored boundaries; higher
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
        codeSplitting: {
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
      ignored: ['**/src-tauri/**', '**/.claude/**'],
    },
  },

  // Don't accidentally bundle Tauri-only modules into the web build.
  // `src/lib/tauri.ts` gates every import behind `__IS_TAURI_BUILD__`, so the
  // web bundle never references them; excluding them from pre-bundling keeps
  // the dev server from touching them either.
  optimizeDeps: {
    exclude: isTauriContext
      ? []
      : [
          '@tauri-apps/api',
          '@tauri-apps/plugin-dialog',
          '@tauri-apps/plugin-fs',
          '@tauri-apps/plugin-opener',
        ],
  },
}));
