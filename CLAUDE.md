# CLAUDE.md

Guidance for Claude (and other AI assistants) working on this repository.

## Project context

**JSONPrism** converts one JSON input into 12 formats (JSONL, CSV, TSV, YAML, XML, TOML, .NET RESX, Markdown table, SQL INSERT, BSON, CBOR, MessagePack) and parses six of them (JSONL, CSV, TSV, YAML, TOML, RESX) back, plus the input-only JSONC → JSON. Conversion always runs on the user's device. It ships as:

- a web app at <https://jsonprism.poli0981.dev>, served by the Cloudflare Worker `jsonprism` (static assets behind a tiny Worker that rate limits requests and answers `/api/*`), deployed by Cloudflare Workers Builds on every push to `main`;
- native apps built with Tauri 2: Windows, macOS, Linux and Android (sideload APK).

GitHub Pages (`poli0981.github.io/jsonPrism`) now only redirects to the new domain.

The maintainer is **Kokone** ([@poli0981](https://github.com/poli0981)). Audience: the developer community on the open-source Discord server plus YouTube viewers who watch indie/visual-novel gameplay and occasionally want a quick devtool.

**Current release**: 2.1.0. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what is next.

## Stack — exact versions matter

- **Node.js** 26 (`.nvmrc`; `engines.node` >= 26.0.0). npm 11; nothing needs dependency install scripts (CI runs `npm ci --ignore-scripts`).
- **TypeScript 7** (native compiler) — `@typescript/native` (`npm:typescript@^7`) provides `tsc`. The `typescript` package is an alias for `@typescript/typescript6` and exists only because typescript-eslint needs the TS 6 API; don't "fix" the alias. Remove it once TS 7.1 ships an API and typescript-eslint supports it.
  - Strict mode, `verbatimModuleSyntax`, `erasableSyntaxOnly` (no enums, no parameter properties), no `baseUrl` (TS 7 rejects it; `paths` only), `types` listed explicitly per tsconfig (TS 7 defaults to `[]`).
  - `target` ES2025, but app `lib` is ES2023: **don't use ES2025 runtime APIs** (Iterator helpers, Set methods, `Promise.try`, `RegExp.escape`…). The floors are Android WebView Chromium 111 and macOS 12 WebKit.
  - tsconfigs: `tsconfig.app.json` (browser code), `tsconfig.test.json` (tests, Node types), `tsconfig.node.json` (config files), `tsconfig.worker.json` (Worker; types from `wrangler types`).
- **React** 19.3 (new JSX transform, `use()`, ref-as-prop, `<title>` hoisting), **React Router** 8 (`react-router` only).
- **Vite** 8 (Rolldown + Oxc). Chunks are split with `build.rollupOptions.output.codeSplitting.groups` (the old `manualChunks`/`advancedChunks` forms are deprecated). Leave `build.target` at the default; an ES-year target also raises the CSS target.
- **Tailwind CSS** v4 (`@theme inline` in CSS, no `tailwind.config.ts`), **shadcn/ui** New York style in `components.json`.
- **ESLint** 10 flat config (`defineConfig`) + typescript-eslint 8, eslint-plugin-react-hooks 7 (React Compiler rules: no setState in effects, no components defined during render, pure render), react-refresh.
- **Prettier** 3 with `prettier-plugin-tailwindcss`, **Knip**, **Vitest** 5 (projects: `app` = jsdom, `worker` = node).
- **Cloudflare**: wrangler 4, `wrangler.jsonc`, Worker code in `worker/`.

Do not propose downgrading or "modernizing" to deprecated patterns.

## Web platform (Cloudflare)

- `wrangler.jsonc`: static assets from `dist/` with SPA fallback. Every request except the hashed `/assets/*` bundles runs the Worker first (`run_worker_first`): it rate limits per client (`worker/rate-limit.ts`), then passes pages to `env.ASSETS.fetch()` (which still applies `_headers`, `_redirects` and the SPA fallback) or answers `/api/*`. Bindings: `ASSETS`, `SITE_LIMITER` / `API_LIMITER` / `VERIFY_LIMITER` (rate limits; each needs a preview twin with its own `namespace_id` under `previews`), var `ALLOWED_HOSTNAMES`, secret `TURNSTILE_SECRET` (dashboard; locally `.dev.vars`, copied from `.dev.vars.example`).
- `worker/index.ts` may only have a **default export** — workerd treats every named export of the entry module as an entrypoint and refuses to start. Put shared code in other modules (`worker/verify.ts`, `worker/turnstile.ts`, `worker/http.ts`).
- Worker logs are structured (`logEvent`) and must never contain IPs, tokens or user content.
- `public/_headers` holds the CSP and security headers; `public/_redirects` maps the old `/jsonPrism/*` paths. Adding any third-party script, style, font or connection means updating the CSP there (and the Tauri CSP in `tauri.conf.json` if it applies to the apps).
- `wrangler dev` rewrites the request URL and `Origin` to the production route; the verify endpoint relaxes its origin check only under Cloudflare's test secret.
- Local preview of the real edge setup: `npm run preview:cf` (http://localhost:8787). `npm run cf:check` is the deploy dry run CI uses.

## Web-only services

Turnstile and Web Analytics exist **only in the web build** — never in Tauri builds, never in `npm run dev` (Turnstile can be forced with `VITE_TURNSTILE_DEV=1`).

- **Turnstile** (`src/lib/turnstile.ts`, `src/components/common/HumanCheck.tsx`, `worker/verify.ts`): runs in the Consent Gate, verified server-side, remembered 7 days. Rejected token → gate stays closed. Cloudflare unreachable → let the user continue after a warning (conversion never needs the network). Keep the action name in sync between client and Worker.
- **Web Analytics** (`src/lib/analytics.ts`): injected only on the production hostname, after consent, while the Appearance toggle is on (default off under Global Privacy Control).
- Changing what the website collects means updating `PRIVACY.md` and bumping `CONSENT_VERSION` in `src/lib/consent-storage.ts` so users accept again.

## Tauri 2 apps

The same React UI runs in the browser and in Tauri (desktop + Android).

**Runtime detection**: `isTauri()` from `src/lib/tauri.ts`, backed by the build-time `__IS_TAURI_BUILD__`, `__IS_ANDROID_BUILD__` and `__TAURI_PLATFORM__` defines. The web bundle never imports Tauri modules statically — they sit behind dynamic imports guarded by these flags so tree-shaking keeps them out of the web build.

**When to branch on the platform**:

- File dialogs: web uses a hidden `<input type="file">`; Tauri uses `nativeOpenFiles()` (`plugin-dialog`).
- Saving output or a `.zip`: web uses a Blob download (`src/lib/download.ts`); Tauri uses `nativeSaveBlob()` (save dialog + `plugin-fs.writeFile`).
- Drag-drop from the OS: web uses `react-dropzone`; Tauri uses the `tauri://drag-drop` event via `useTauriDragDrop`.
- External links: `openExternal()` (the Android WebView ignores `target="_blank"`).
- Consent Gate: shown on web, Android, macOS and Linux; Windows skips it because the installer's license page (`src-tauri/license.rtf`) already asks.

**Don't branch** for things that work everywhere: clipboard, in-memory work, the converters. Keep platform code at the I/O boundary.

**Adding a Tauri command**: declare it in `src-tauri/src/lib.rs` with `#[tauri::command]`, register it in `generate_handler!`, expose a typed wrapper in `src/lib/tauri.ts` using `invoke()`, and grant only the permissions it needs.

**Permission model**: `src-tauri/capabilities/default.json` is least-privilege — `core:default`, `opener:default`, dialog open/save, fs read-text/write/stat. The static fs scope is `$DOCUMENT`, `$DOWNLOAD`, `$DESKTOP`; files the user picks in a dialog or drops on the window are added to the scope at runtime by the plugins. `plugins.fs.requireLiteralLeadingDot` is `true`, so globs never match dotfiles. Don't widen the scope to `$HOME/**`.

**Versions**: `tauri.conf.json` reads the version from `package.json`. On a release bump `package.json`, `src-tauri/Cargo.toml` (+ `Cargo.lock`) and `bundle.android.versionCode` (MAJOR*10000 + MINOR*100 + PATCH). The release workflow refuses a tag that doesn't match.

**Icons**: edit `src-tauri/icons/icon.svg` (1024×1024) and run `npm run tauri:icon`. Generated PNG/ICO/ICNS files are gitignored; CI regenerates them. Revert unintended changes it makes under `src-tauri/gen/android/`.

**Bundling**: `npm run tauri:build` builds for the current OS. Releases come from pushing a `vX.Y.Z` tag: `.github/workflows/release.yml` builds Windows, macOS universal, Linux and Android into one draft release with `SHA256SUMS.txt` and provenance attestations.

**Velopack note**: PhantomMAC uses Velopack for `.exe` deltas; JSONPrism uses Tauri's native bundler (`.msi` + NSIS `.exe`). Don't mix the two.

## Code style — non-negotiable

- **Pure functions for converters**. Each converter is a pure, synchronous module implementing `Converter<TOptions>` from `src/converters/types.ts`. No I/O, no DOM, no global state.
- **Errors as values**. Converters return `{ ok: true, output } | { ok: false, error }`. Never throw across converter boundaries; callers go through `safeConvert`/`safeReverse` in `registry.ts`, which also catch the unexpected. Turn caught values into messages with `errorMessage()` from `src/lib/errors.ts`.
- **Untrusted keys**: build objects from parsed input with `defineOwn()` (`src/lib/json.ts`) so `__proto__` stays a plain key; sort keys with `compareOrdinal`.
- **No `any`**. Use `unknown` and narrow. The only sanctioned `any` is the heterogeneous record in `registry.ts`.
- **Type-only imports**: `import type { Converter } from './types'` (ESLint `consistent-type-imports`).
- **Use the `@/*` path alias** inside `src/`.
- **Tailwind class order**: rely on `prettier-plugin-tailwindcss`; never hand-sort.
- **Don't fight the theme system**. Use the tokens (`--color-prism-*`, `--color-success`, `--color-warning`, `bg-background`, …), which have separate light and dark values. No hard-coded hex. Animations go behind `motion-safe:`.
- **i18n everything user-facing** in all four locales: `en.json`, `vi.json`, `ja.json`, `zh-CN.json` (`src/i18n/__tests__/locales.test.ts` enforces key parity). Libraries return error *codes*; components translate them.
- **Logging**: use `createLogger(scope)` from `src/lib/logger.ts`, not `console.*` (ESLint warns). Logs stay in memory and feed About → Copy diagnostics; never log user content.
- **Heavy work off the main thread**: conversions of large inputs and batch jobs go through `src/lib/convert-client.ts` (Web Worker); keep `convert-worker.ts` free of DOM access.

## File layout — where things go

```
src/
├── app/                 # App component + routes
├── components/
│   ├── ui/              # shadcn components — generated by CLI, don't hand-edit
│   ├── layout/          # Header, Footer, AppearanceMenu, Layout
│   ├── converter/       # The workspace UI
│   └── common/          # Reusable bits (ConsentGate, HumanCheck, error states…)
├── converters/          # ONE file per format. Self-contained.
├── hooks/               # React hooks
├── i18n/                # i18next setup + locales
├── lib/                 # Pure utilities and platform glue
├── pages/               # Route components
├── stores/              # Zustand stores (workspace, batch, consent, preferences)
├── styles/              # globals.css ONLY — no per-component CSS files
└── test/                # Vitest setup
worker/                  # Cloudflare Worker (its own runtime and tsconfig)
public/                  # Static files incl. _headers, _redirects, .well-known/
src-tauri/               # Tauri shell (Rust), capabilities, Android project
```

If you find yourself wanting another top-level folder, stop and reconsider.

## Adding a new converter — checklist

1. Create `src/converters/myformat.ts` exporting `myFormatConverter`.
2. Implement `Converter<MyFormatOptions>`, including `meta.extension` (plus `altExtensions` for aliases such as `yml`, `binary` for byte formats, and `inputOnly` for formats that only convert to JSON, like JSONC — their `convert()` returns an error). Return errors as values.
3. Add the ID to the `FormatId` union in `src/converters/types.ts`.
4. Register it in `src/converters/registry.ts` (`CONVERTERS` and `ALL_FORMATS`).
5. Add `formats.myformat` (and any option labels) to all four locale files.
6. A new parsing library gets its own `p-*` group in `vite.config.ts` `codeSplitting.groups`.
7. Add regression tests under `src/converters/__tests__/`; the contract test runs every converter against hostile input automatically.
8. Update the format tables in `README.md` and `README.vi.md`, `THIRD-PARTY.md` for new dependencies, and `docs/ROADMAP.md`.

## Pitfalls observed in the wild

- **Options live outside the converter call signature**. They are passed separately so the UI can introspect `defaultOptions`/the option schema; stored options are validated against that schema (`src/lib/options-storage.ts`).
- **Don't use `JSON.parse` directly in components**. Go through `parseJsonInput` in `src/lib/detect.ts` so error positions and the precision-loss warning surface uniformly.
- **CSV nested values**: stringify nested objects as JSON by default (`nestedStrategy: 'json'`). `flatten` is alpha — keep it, don't make it default. Columns are the union of keys across rows.
- **YAML quoting** (js-yaml 5): `quoteStyle` picks the quote character and `forceQuotes` must be `true` for it to apply; `'auto'` means no forced quotes. Tested.
- **Binary formats** (BSON, CBOR, MessagePack) produce text (base64/hex) for display; downloads and ZIPs must contain the decoded bytes.
- **Base path**: the web build is served from `/` on its own domain. Don't reintroduce a `/jsonPrism/` base or router basename.
- **Tailwind v4 dark mode**: `@custom-variant dark (&:is(.dark *));`. The `.dark` class on `<html>` (set before paint by `public/theme-init.js`) drives it. Don't add `darkMode: 'class'` configs.
- **Inline scripts are blocked by the CSP**. Early page logic goes in a file under `public/` (like `theme-init.js`).

## Commands the maintainer actually runs

```bash
npm run dev          # 99% of the time
npm run typecheck    # before pushing (tsc -b + the Worker)
npm run lint         # CI does this anyway
npm test             # Vitest, app + worker projects
npm run build        # verify production output
npm run preview:cf   # the real Cloudflare setup on http://localhost:8787
```

CI (`.github/workflows/ci.yml`) also runs `format:check`, `knip`, coverage, `cf:check`, SonarQube Cloud and `cargo fmt`/`clippy`. The maintainer typically uses **WebStorm** (JetBrains license), so Prettier and ESLint run on save.

## Communication preferences

- Reply in **Vietnamese** unless the maintainer writes in English.
- Be direct. Skip unnecessary preamble.
- When proposing changes, show the diff or full file; don't just describe.
- Match the file-naming and patterns already established (`*Converter`, `useFoo`, kebab-case for files, PascalCase for components).
- The maintainer dislikes excessive emoji; reserve them for status indicators in docs (✅ 🔜 📋).
- When unsure between two equally valid approaches, pick one and explain briefly — don't ask which the maintainer prefers unless it's a meaningful tradeoff.

## Roadmap reference

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the canonical phase plan and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for hosting and releases. Update them as work lands.
