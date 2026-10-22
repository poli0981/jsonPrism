# Developer environment

This is the toolchain the maintainer keeps installed for JSONPrism +
sibling projects. It is **not** a strict requirement for contributing —
most contributors only need the **web app** section.

## Required for the web app

| Tool | Minimum | Latest exercised | Notes |
|---|---|---|---|
| **Node.js** | 26.0.0 | 26.12.1 | `.nvmrc` is `26`; [package.json](../package.json) `engines.node` is `>=26.0.0`. CI reads `.nvmrc`. |
| **npm** | 11 (bundled with Node 26) | 11.20.0 | `npm ci` is what CI runs (with `--ignore-scripts`). |
| **Git** | recent (≥ 2.40) | — | Commit signing (`commit.gpgsign=true`) recommended. |

**Install scripts.** npm 11 may block the install scripts of dependencies.
Nothing in JSONPrism needs them — esbuild, workerd and the Tauri CLI resolve
their platform binaries at runtime — so leave them blocked. CI installs with
`npm ci --ignore-scripts`.

## TypeScript 7 (with a TypeScript 6 alias)

Two TypeScript packages are installed side by side:

| `package.json` name | Resolves to | Provides |
|---|---|---|
| `@typescript/native` | `typescript@^7` | The `tsc` binary: TypeScript 7, the native compiler used by `npm run typecheck` and `npm run build`. |
| `typescript` | `@typescript/typescript6@^6` | The TypeScript 6 **API** (binary `tsc6`) that typescript-eslint 8.72 needs — its peer range is `<6.1`. |

- **`npm run typecheck` is the source of truth** (`tsc -b` plus the Worker
  project). CI fails if `tsc` is not TypeScript 7.
- **WebStorm**: Settings → Languages & Frameworks → TypeScript → TypeScript:
  select `<project>/node_modules/typescript` (the TS 6 API) for the language
  service, or the TypeScript 7 native preview as described in JetBrains' docs.
  The IDE's TS 6 service can disagree with TS 7 on edge cases; trust
  `npm run typecheck`.
- Don't "fix" the alias. It goes once TypeScript 7.1 ships an API that
  typescript-eslint supports; until then Dependabot ignores `typescript` ≥ 6.1.
- TS 7 rules: no `baseUrl` (use `paths`), `types` defaults to `[]` (every
  tsconfig lists its own), enums and parameter properties are not erasable
  (`erasableSyntaxOnly`).
- The target is ES2025 but the app's `lib` is ES2023: don't use ES2025 runtime
  APIs (Iterator helpers, Set methods, `Promise.try`, `RegExp.escape`). The
  Android WebView (Chromium 111) and macOS 12 WebKit floors lack them.
- tsconfigs: `tsconfig.app.json` (browser code), `tsconfig.test.json` (tests),
  `tsconfig.node.json` (config files), `tsconfig.worker.json` (Cloudflare Worker).

## Cloudflare Worker (local)

`wrangler` is a devDependency; there is nothing to install globally.

```bash
cp .dev.vars.example .dev.vars   # once — Cloudflare's always-pass Turnstile test secret
npm run preview:cf               # wrangler dev on http://localhost:8787 (builds first)
```

- `.dev.vars` holds the Worker secret `TURNSTILE_SECRET` for local runs. It is
  gitignored; never put the production secret in it.
- `npm run preview:cf` serves `dist/` the way production does (`_headers`,
  `_redirects`, SPA fallback) together with the `/api/*` Worker. On localhost
  the app uses Cloudflare's test sitekey, so the Consent Gate's Turnstile check
  passes on its own.
- `npm run cf:types` — regenerates `worker-configuration.d.ts` (gitignored)
  after you change bindings in `wrangler.jsonc`; `npm run typecheck` runs it too.
- `npm run cf:check` — `wrangler deploy --dry-run`, as CI does.
- `npm run dev` (Vite) has no Worker and no Turnstile; set
  `VITE_TURNSTILE_DEV=1` to show the widget anyway.

Production deploys are covered in [docs/DEPLOYMENT.md](DEPLOYMENT.md).

## Required for the Tauri desktop build

In addition to the web app deps:

| Tool | Minimum | Latest exercised | Notes |
|---|---|---|---|
| **Rust** | 1.90 | 1.98.0 | Install via `rustup`; stable channel (CI uses stable). `Cargo.toml` declares `rust-version = "1.90"`, the floor of tauri 2.12 and tauri-plugin-fs 2.7. |
| **Platform build deps** | OS-specific | — | Windows: Visual Studio Build Tools (C++ workload) + WebView2. macOS: Xcode Command Line Tools. Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev libgtk-3-dev` (what CI installs). |

Run `npm run tauri:icon` once (the generated icons are gitignored), then
`npm run tauri:dev` or `npm run tauri:build`. CI also runs
`cargo fmt --check` and `cargo clippy --all-targets --locked -- -D warnings`
in `src-tauri/`; run them before pushing Rust changes.

## Required for the Android build

In addition to the desktop toolchain:

| Tool | Version | Notes |
|---|---|---|
| **JDK** | 17+ | Android Studio's bundled JBR works; CI uses Temurin 17. `JAVA_HOME` must point at it. |
| **Android SDK** | Platform 36 | `compileSdk` / `targetSdk` 36, `minSdk` 31. Also Build-Tools, Platform-Tools, Command-line Tools. `ANDROID_HOME` points at the SDK. |
| **Android NDK** | 27.2.12479018 | The version CI pins. `NDK_HOME` → `$ANDROID_HOME/ndk/27.2.12479018`. |
| **Rust targets** | — | `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android` |

Then `npm run tauri:android:dev` or `npm run tauri:android:build`. NDK
selection, signing and the CI secrets are in
[docs/TAURI-NOTES.md](TAURI-NOTES.md#android-sideload-apk).

## Quality tools

- `npm run lint` — ESLint 10 flat config with typescript-eslint 8.72 and
  eslint-plugin-react-hooks 7 (React Compiler rules).
- `npm run knip` — Knip 6: unused files, exports and dependencies
  (`knip.json`). CI runs it.
- `npm run format` / `npm run format:check` — Prettier 3.9 with Tailwind class
  sorting.
- `npm test` — Vitest 5 with two projects: `app` (jsdom) and `worker` (node).
- `npm run test:coverage` — the same run with V8 coverage; reports land in
  `coverage/` (text, HTML and `lcov.info`, which CI passes to SonarQube Cloud).

## Other tooling on the maintainer's machine

These are unrelated to JSONPrism but documented so anyone reproducing
the broader dev environment knows what's around:

- **Python**: 3.12.x, 3.14.x (used for adjacent scripting projects).
- **.NET**: 8.x, 9.x, 10.x, 11.x (preview) — for sibling AutoClickForge / PhantomMAC projects.
- **GPG**: commit signing enabled (`commit.gpgsign=true`).

## IDEs

- **JetBrains** WebStorm (2026.x) — primary IDE; runs Prettier + ESLint on save.
  Point its TypeScript service at `node_modules/typescript` (see above).
- **Visual Studio Code** — secondary; useful for the Tauri/Rust side via `rust-analyzer`.

## Recommended workflow

```bash
# One-time
git clone https://github.com/poli0981/jsonPrism.git
cd jsonPrism
npm ci
cp .dev.vars.example .dev.vars

# Daily
npm run dev              # web dev server, http://localhost:5173
npm run preview:cf       # production-like preview with the Worker, http://localhost:8787

# Before pushing (CI runs the same checks, with format:check instead of format)
npm run format
npm run lint
npm run knip
npm run typecheck
npm run test:coverage
npm run build
npm run cf:check
```

## Related docs

- [docs/pc_spec.md](pc_spec.md) — hardware reference.
- [docs/TAURI-NOTES.md](TAURI-NOTES.md) — Tauri-specific notes.
- [docs/DEPLOYMENT.md](DEPLOYMENT.md) — Cloudflare hosting and releases.
- [README.md](../README.md) — project overview + quick start.
- [Tiếng Việt](i18n/vi/dev_env.md)
