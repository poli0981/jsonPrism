# Contributing to JSONPrism

Thanks for considering a contribution! JSONPrism is an open-source project under Apache License 2.0.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 26 | Pinned in [`.nvmrc`](.nvmrc), so `nvm use` (or `fnm use`) picks it up. `engines.node` is `>=26.0.0`. |
| **npm** | 11 | Ships with Node 26. |
| **Rust** | latest stable (Tauri 2.12 needs ≥ 1.90) | Only for the desktop / Android shell in `src-tauri/`. |

The OS packages needed for Tauri builds are listed under "Desktop app"
and "Android app" in [README.md](README.md).

## Quick start

```bash
git clone https://github.com/poli0981/jsonPrism.git
cd jsonPrism
npm ci
npm run dev
```

Open <http://localhost:5173>.

npm 11 may block or warn about dependency install scripts. That is
expected: nothing in this project needs them, and CI installs with
`npm ci --ignore-scripts`.

Desktop and Android shells (Tauri 2):

```bash
npm run tauri:dev           # desktop window around the dev server
npm run tauri:android:dev   # Android emulator or device
```

## Before opening a PR

1. **Run the same checks as CI**. If any fails, your PR can't be merged:

   ```bash
   npm run format:check   # Prettier (fix with: npm run format)
   npm run lint           # ESLint (many issues fix with: npm run lint:fix)
   npm run knip           # unused files, exports and dependencies
   npm run typecheck      # TypeScript 7: app, tests, config files, Worker
   npm test               # Vitest (CI runs npm run test:coverage)
   npm run build          # production web build into dist/
   npm run cf:check       # Worker deploy dry run; needs dist/ from the build
   ```

   If you changed `src-tauri/`, CI also runs `cargo fmt --check` and
   `cargo clippy --all-targets --locked -- -D warnings` in that folder.
   Run `npm run tauri:icon` and `npm run build` first: the Rust build
   embeds the generated icons and `dist/`.

2. **Match the project style.** Read [`CLAUDE.md`](CLAUDE.md) for the
   non-negotiable code conventions (converter shape, error handling, i18n
   requirements). For tool versions, `package.json` and this file are
   authoritative.

3. **Keep PRs focused.** One feature or one fix per PR. Refactors as separate PRs.

4. **Fill in the [PR template](.github/PULL_REQUEST_TEMPLATE.md)**: what
   changed, why, how you tested it, screenshots if UI, and whether AI
   tools helped.

## Toolchain notes

### TypeScript 7 and the TS 6 alias

JSONPrism type-checks and builds with **TypeScript 7**, the native
compiler. Two TypeScript packages are installed side by side on purpose:

| `package.json` entry | Installs | Used for |
|---|---|---|
| `@typescript/native` | `typescript@7` | The `tsc` binary: `npm run typecheck` and `npm run build` |
| `typescript` | `@typescript/typescript6` | The TypeScript 6 API (binary `tsc6`) that typescript-eslint and editors load |

Why: TypeScript 7.0 ships no JavaScript API yet, and typescript-eslint 8
only supports `typescript` below 6.1. Leave the alias as it is (Dependabot
ignores it from 6.1 on). It goes away once TypeScript 7.1 ships an API
that typescript-eslint supports.

- **`npm run typecheck` is the source of truth.** CI also checks that
  `tsc` really is TypeScript 7. Diagnostics from an editor running the
  TS 6 language service can occasionally differ; the command line wins.
- **WebStorm**: in *Settings → Languages & Frameworks → TypeScript*, point
  the TypeScript package at `node_modules/typescript` (the TS 6 API), or
  use the TypeScript 7 native preview as described in JetBrains' docs.
- TS 7 rules to remember: no `baseUrl` (use `paths`), `types` defaults to
  `[]` so every tsconfig lists its own, and `erasableSyntaxOnly` rules out
  enums, runtime namespaces and constructor parameter properties.
- Projects: `tsconfig.app.json` (browser code), `tsconfig.test.json`
  (tests, Node types), `tsconfig.node.json` (Vite / Vitest config) and
  `tsconfig.worker.json` (Cloudflare Worker).

### No ES2025 runtime APIs in app code

TypeScript targets ES2025, but `tsconfig.app.json` deliberately includes
only the **ES2023** library. Do not use ES2025 runtime APIs in `src/`:
Iterator helpers, the new `Set` methods, `Promise.try`, `RegExp.escape`
and the like. The Android WebView floor (Chromium 111) and macOS 12
WebKit don't have them, and the compiler rejects them on purpose. Leave
Vite's `build.target` at its default too. The Worker in `worker/` runs on
Cloudflare's runtime and is not bound by this rule.

### Tests

- `npm test` runs Vitest once, in two projects: `app` (jsdom) for
  `src/**/*.test.{ts,tsx}` and `worker` (Node) for `worker/**/*.test.ts`.
- `npm run test:watch` re-runs on change. `npm run test:coverage` adds V8
  coverage in `coverage/` (CI feeds `lcov.info` to SonarQube Cloud).
- Tests live in `__tests__/` folders next to the code they cover. Add a
  regression test with a bug fix where you can.

## Cloudflare Worker (web build)

The website is served by a Cloudflare Worker configured in
[`wrangler.jsonc`](wrangler.jsonc). Every request except the hashed bundles
under `/assets/` runs the Worker first: it applies a per-client rate limit,
then serves pages from `dist/` through the `ASSETS` binding or answers
`/api/*`. The code lives in
[`worker/`](worker/):

| File | Role |
|---|---|
| `worker/index.ts` | Router: rate limit, then the `ASSETS` binding for pages or the API handlers. The entry module must only have a **default export**: workerd treats named exports as entrypoints. |
| `worker/rate-limit.ts` | Per-client limits (`SITE_LIMITER`, `API_LIMITER`), IPv4 / IPv6-/64 keys, 429 responses |
| `worker/env.ts` | The bindings and variables the Worker reads |
| `worker/verify.ts` | `POST /api/turnstile/verify`: same-origin check, JSON only, body size cap, rate limit |
| `worker/turnstile.ts` | Cloudflare siteverify call: timeout, one retry, hostname / action / age checks |
| `worker/http.ts` | JSON and plain-text responses with strict headers, structured logs |

Worker logs must never contain IP addresses, tokens or user content.

To run it locally:

```bash
cp .dev.vars.example .dev.vars   # Cloudflare's always-pass Turnstile test secret
npm run preview:cf               # wrangler dev on http://localhost:8787 (builds first)
```

`wrangler.jsonc` runs `npm run build` before every `wrangler dev`, deploy and
dry run, so `preview:cf` always serves a fresh build.

- `.dev.vars` is gitignored. Never commit real secrets; production secrets
  live in the Cloudflare dashboard.
- `npm run cf:types` regenerates the gitignored `worker-configuration.d.ts`
  after you change bindings in `wrangler.jsonc` (`npm run typecheck` does
  this too).
- The Turnstile human check is off in `npm run dev` unless you set
  `VITE_TURNSTILE_DEV=1`. On localhost the app uses Cloudflare's test
  sitekey.
- Nobody deploys by hand: Cloudflare Workers Builds deploys every push to
  `main`. `npm run cf:check` is the deploy dry run CI uses. Hosting, secrets,
  rollback and releases are described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Ways to contribute

### Bug reports

Use the [Bug Report](https://github.com/poli0981/jsonPrism/issues/new?template=bug_report.md) template. Include:

- Platform (Web / Windows / macOS / Linux / Android) and browser or OS version
- JSONPrism version (*About → Build info*), or the output of *Copy diagnostics* on the same page
- Steps to reproduce
- Sample JSON that triggers the bug (minimal, please, and nothing private)
- Expected vs actual output

Security vulnerabilities never go in a public issue. See [SECURITY.md](SECURITY.md).

### Feature requests

Use the [Feature Request](https://github.com/poli0981/jsonPrism/issues/new?template=feature_request.md) template. We prioritize features that:

- Fit the "one JSON → many formats" core mission
- Run entirely on the user's device (conversion never touches a server)
- Have a clear use case from a real workflow

### Translations

Currently bundled: **English** (`en`), **Tiếng Việt** (`vi`), **日本語**
(`ja`), **简体中文** (`zh-CN`). The Japanese and Simplified Chinese
locales, and parts of the Vietnamese one, are AI-generated and not
professionally reviewed; see [DISCLAIMER.md](DISCLAIMER.md).
Native-speaker corrections are very welcome.

Every user-facing string goes through i18next, so a new or changed string
means editing **all four** files in `src/i18n/locales/`. The parity test
(`src/i18n/__tests__/locales.test.ts`, part of `npm test` and CI) fails
when a locale is missing a key or has an extra one, changes a
`{{variable}}`, or leaves a value empty. If you aren't confident in a
translation, say so in the PR.

To add a new language:

1. Copy `src/i18n/locales/en.json` to `src/i18n/locales/<locale>.json` and translate every value (keep `{{variables}}` unchanged)
2. Import it in `src/i18n/index.ts` and add it to `resources` and `SUPPORTED_LANGUAGES`
3. Add it to `LANGUAGES` in `src/components/common/LanguageSwitcher.tsx`
4. Add it to the `describe.each` list in `src/i18n/__tests__/locales.test.ts`
5. If Cloudflare Turnstile supports the language, map it in `turnstileLanguage()` in `src/lib/turnstile.ts`
6. Open a PR

### Adding a new converter

See the **"Adding a new converter — checklist"** section in [`CLAUDE.md`](CLAUDE.md).

Briefly:

1. New file `src/converters/myformat.ts` implementing `Converter<TOptions>` (pure, errors as values)
2. Add the ID to `FormatId` in `types.ts` and register the converter in `registry.ts`
3. Add `formats.myformat` labels to all four locales
4. Add tests in `src/converters/__tests__/` (`contract.test.ts` already runs every registered converter against the errors-as-values contract)
5. New parsing library? Give it its own `p-*` entry in the `codeSplitting.groups` list in `vite.config.ts`
6. Update the format tables in `README.md` and `README.vi.md`, the roadmap entry in `docs/ROADMAP.md`, and `CHANGELOG.md`

## Commit messages

We follow a relaxed version of [Conventional Commits](https://www.conventionalcommits.org):

```
feat(converter): add TOML converter with smol-toml
fix(csv): escape pipes in cell values
perf(batch): convert large inputs in a Web Worker
docs: clarify Tauri build steps
build(deps): bump react to 19.3
ci: pin actions to full commit SHAs
```

Prefixes: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`
(dependencies, bundling, toolchain), `ci` (GitHub Actions workflows),
`chore`, `style`.

## Auto-ignored contributions

To keep the maintainer's review queue manageable, the following are
closed without review:

- **PRs with suspicious code.** If a diff looks like obfuscated/minified
  code, hidden network calls, or subtly tampered third-party files, it
  will be flagged. If CodeQL or Dependabot also flag it, the contributor
  will be **banned** without exception. The maintainer may also verify
  suspect sections by hand.
- **PRs / issues posting unknown / random links** (especially shortened
  URLs to "demos", "fixes", etc. with no clear source).
- **Behavior / language violating GitHub's policy** — harassment, hate
  speech, doxxing, NSFW content, etc.
- **Off-topic preamble**, e.g. "Chào buổi sáng, hôm nay là 1 ngày trời
  đẹp…" ("Good morning, what a lovely day…") or any greeting/filler that
  doesn't immediately address the issue. Get to the point: what's wrong,
  what's the expected behavior, what reproduces it.
- **PRs without a meaningful description** or test plan. The Summary and
  Test plan sections of the PR template are required.

These rules exist because this is a one-person + AI-assisted project
(see [DISCLAIMER.md](DISCLAIMER.md)); time spent triaging low-effort
contributions takes away from real work.

## Code of Conduct

This project adopts the [Contributor Covenant v2.1](CODE_OF_CONDUCT.md).
Be kind. Assume good faith. Disagreements about technical choices are
fine; personal attacks and harassment are not.

Report conduct concerns to the maintainer at **code@poli0981.dev**.
Security vulnerabilities are not conduct reports: follow
[SECURITY.md](SECURITY.md) (private advisory or security@poli0981.dev).

## License

By contributing, you agree your contributions will be licensed under [Apache License 2.0](LICENSE).
