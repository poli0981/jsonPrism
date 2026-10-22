# Third-party notice

JSONPrism is built on top of open-source libraries. This page lists each
direct dependency declared in [`package.json`](package.json) and
[`src-tauri/Cargo.toml`](src-tauri/Cargo.toml), the exact version used by
**JSONPrism 2.0.0**, the upstream license, and a link to the project. It
also lists the third-party services the website uses.

Versions are the ones locked in [`package-lock.json`](package-lock.json)
and [`src-tauri/Cargo.lock`](src-tauri/Cargo.lock); the manifests declare
semver ranges. License identifiers (SPDX) are copied from each package's
own `package.json` or `Cargo.toml`. Transitive dependencies are listed in
the lockfiles.

If you are bundling JSONPrism into a derived work, these licenses (MIT,
ISC, BSD, Apache-2.0, OFL-1.1) require that you keep the upstream
copyright and license notices. This file is a starting point.

---

## UI framework

| Package | Version | License | Link |
|---|---|---|---|
| `react` | 19.3.1 | MIT | [react.dev](https://react.dev/) |
| `react-dom` | 19.3.1 | MIT | [react.dev](https://react.dev/) |
| `react-router` | 8.5.0 | MIT | [reactrouter.com](https://reactrouter.com/) |
| `tailwindcss` (devDep) | 4.3.3 | MIT | [tailwindcss.com](https://tailwindcss.com/) |
| `tw-animate-css` (devDep) | 1.4.0 | MIT | [github.com/Wombosvideo/tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) |
| `tailwind-merge` | 3.7.0 | MIT | [github.com/dcastil/tailwind-merge](https://github.com/dcastil/tailwind-merge) |
| `class-variance-authority` | 0.7.1 | Apache-2.0 | [cva.style](https://cva.style/) |
| `clsx` | 2.1.1 | MIT | [github.com/lukeed/clsx](https://github.com/lukeed/clsx) |
| `@radix-ui/react-dialog` | 1.3.1 | MIT | [radix-ui.com](https://www.radix-ui.com/) |
| `@radix-ui/react-slot` | 1.5.0 | MIT | [radix-ui.com](https://www.radix-ui.com/) |
| `@radix-ui/react-switch` | 1.4.1 | MIT | [radix-ui.com](https://www.radix-ui.com/) |
| `@radix-ui/react-tabs` | 1.2.1 | MIT | [radix-ui.com](https://www.radix-ui.com/) |
| `lucide-react` | 1.61.0 | ISC | [lucide.dev](https://lucide.dev/) |
| `sonner` | 2.0.8 | MIT | [sonner.emilkowal.ski](https://sonner.emilkowal.ski/) |
| `react-dropzone` | 20.1.4 | MIT | [react-dropzone.js.org](https://react-dropzone.js.org/) |

The component patterns under `src/components/ui/` are generated from
**[shadcn/ui](https://ui.shadcn.com/)** (MIT) — copied into the repo, not
installed as a runtime dependency. `tailwindcss` and `tw-animate-css` are
build-time packages whose generated CSS ships in the bundle.

## Code editor

| Package | Version | License | Link |
|---|---|---|---|
| `@uiw/react-codemirror` | 4.25.12 | MIT | [uiwjs.github.io/react-codemirror](https://uiwjs.github.io/react-codemirror/) |
| `@codemirror/state` | 6.7.6 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/view` | 6.43.15 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/language` | 6.13.1 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-json` | 6.0.2 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-yaml` | 6.1.3 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-xml` | 6.1.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-markdown` | 6.5.2 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-sql` | 6.10.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/legacy-modes` | 6.5.5 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lint` | 6.9.7 | MIT | [codemirror.net](https://codemirror.net/) |
| `@lezer/highlight` | 1.2.5 | MIT | [lezer.codemirror.net](https://lezer.codemirror.net/) |

## Parsers / serialization

| Package | Version | License | Link |
|---|---|---|---|
| `papaparse` | 5.7.0 | MIT | [papaparse.com](https://www.papaparse.com/) |
| `js-yaml` | 5.5.0 | MIT | [github.com/nodeca/js-yaml](https://github.com/nodeca/js-yaml) |
| `smol-toml` | 1.9.1 | BSD-3-Clause | [github.com/squirrelchat/smol-toml](https://github.com/squirrelchat/smol-toml) |
| `fast-xml-parser` | 5.11.2 | MIT | [github.com/NaturalIntelligence/fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) |
| `bson` | 7.3.3 | Apache-2.0 | [github.com/mongodb/js-bson](https://github.com/mongodb/js-bson) |
| `cbor-x` | 1.6.8 | MIT | [github.com/kriszyp/cbor-x](https://github.com/kriszyp/cbor-x) |
| `@msgpack/msgpack` | 3.1.3 | ISC | [msgpack.org](https://msgpack.org/) |
| `fflate` | 0.8.3 | MIT | [github.com/101arrowz/fflate](https://github.com/101arrowz/fflate) |

## State & i18n

| Package | Version | License | Link |
|---|---|---|---|
| `zustand` | 5.0.16 | MIT | [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) |
| `i18next` | 26.5.5 | MIT | [i18next.com](https://www.i18next.com/) |
| `react-i18next` | 17.1.1 | MIT | [react.i18next.com](https://react.i18next.com/) |
| `i18next-browser-languagedetector` | 8.2.1 | MIT | [github.com/i18next/i18next-browser-languageDetector](https://github.com/i18next/i18next-browser-languageDetector) |

## Cloudflare (web build)

| Package | Version | License | Link |
|---|---|---|---|
| `@marsidev/react-turnstile` | 1.6.3 | MIT | [github.com/marsidev/react-turnstile](https://github.com/marsidev/react-turnstile) |
| `wrangler` (devDep) | 4.151.3 | MIT OR Apache-2.0 | [github.com/cloudflare/workers-sdk](https://github.com/cloudflare/workers-sdk) |

`@marsidev/react-turnstile` renders the Turnstile widget on the website
only. `wrangler` runs, type-checks and deploys the Worker in `worker/`.
The services themselves are covered under
[Third-party services](#third-party-services-web-build-only).

## Tauri (desktop and Android)

| Package | Version | License | Link |
|---|---|---|---|
| `@tauri-apps/api` | 2.12.4 | Apache-2.0 OR MIT | [tauri.app](https://tauri.app/) |
| `@tauri-apps/plugin-dialog` | 2.8.3 | MIT OR Apache-2.0 | [tauri.app](https://tauri.app/) |
| `@tauri-apps/plugin-fs` | 2.7.1 | MIT OR Apache-2.0 | [tauri.app](https://tauri.app/) |
| `@tauri-apps/plugin-opener` | 2.7.2 | MIT OR Apache-2.0 | [tauri.app](https://tauri.app/) |
| `@tauri-apps/cli` (devDep) | 2.12.4 | Apache-2.0 OR MIT | [tauri.app](https://tauri.app/) |

### Rust crates (`src-tauri/Cargo.lock`)

| Crate | Version | License | Link |
|---|---|---|---|
| `tauri` | 2.12.5 | Apache-2.0 OR MIT | [crates.io/crates/tauri](https://crates.io/crates/tauri) |
| `tauri-build` (build dependency) | 2.7.4 | Apache-2.0 OR MIT | [crates.io/crates/tauri-build](https://crates.io/crates/tauri-build) |
| `tauri-plugin-dialog` | 2.8.3 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-dialog](https://crates.io/crates/tauri-plugin-dialog) |
| `tauri-plugin-fs` | 2.7.1 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-fs](https://crates.io/crates/tauri-plugin-fs) |
| `tauri-plugin-opener` | 2.7.2 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-opener](https://crates.io/crates/tauri-plugin-opener) |
| `tauri-plugin-single-instance` (desktop only) | 2.5.4 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-single-instance](https://crates.io/crates/tauri-plugin-single-instance) |
| `serde` | 1.0.229 | MIT OR Apache-2.0 | [serde.rs](https://serde.rs/) |
| `serde_json` | 1.0.154 | MIT OR Apache-2.0 | [github.com/serde-rs/json](https://github.com/serde-rs/json) |

## Build tooling

Development dependencies: used to build, lint and test JSONPrism, not
shipped in the app.

| Package | Version | License | Link |
|---|---|---|---|
| `vite` | 8.3.5 | MIT | [vite.dev](https://vite.dev/) |
| `@vitejs/plugin-react` | 6.1.2 | MIT | [github.com/vitejs/vite-plugin-react](https://github.com/vitejs/vite-plugin-react) |
| `@tailwindcss/vite` | 4.3.3 | MIT | [tailwindcss.com](https://tailwindcss.com/) |
| `@typescript/native` (alias of `typescript@^7`) | 7.0.2 | Apache-2.0 | [typescriptlang.org](https://www.typescriptlang.org/) |
| `typescript` (alias of `@typescript/typescript6`, wraps TypeScript 6.0.3) | 6.0.2 | Apache-2.0 | [typescriptlang.org](https://www.typescriptlang.org/) |
| `eslint` | 10.13.0 | MIT | [eslint.org](https://eslint.org/) |
| `@eslint/js` | 10.0.1 | MIT | [eslint.org](https://eslint.org/) |
| `typescript-eslint` | 8.72.0 | MIT | [typescript-eslint.io](https://typescript-eslint.io/) |
| `eslint-plugin-react-hooks` | 7.1.1 | MIT | [github.com/facebook/react](https://github.com/facebook/react) |
| `eslint-plugin-react-refresh` | 0.5.7 | MIT | [github.com/ArnaudBarre/eslint-plugin-react-refresh](https://github.com/ArnaudBarre/eslint-plugin-react-refresh) |
| `globals` | 17.13.0 | MIT | [github.com/sindresorhus/globals](https://github.com/sindresorhus/globals) |
| `prettier` | 3.9.10 | MIT | [prettier.io](https://prettier.io/) |
| `prettier-plugin-tailwindcss` | 0.8.1 | MIT | [github.com/tailwindlabs/prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) |
| `knip` | 6.42.1 | ISC | [knip.dev](https://knip.dev/) |
| `vitest` | 5.0.5 | MIT | [vitest.dev](https://vitest.dev/) |
| `@vitest/coverage-v8` | 5.0.5 | MIT | [vitest.dev](https://vitest.dev/) |
| `jsdom` | 30.1.3 | MIT | [github.com/jsdom/jsdom](https://github.com/jsdom/jsdom) |
| `@testing-library/react` | 16.3.3 | MIT | [testing-library.com](https://testing-library.com/) |
| `@testing-library/dom` | 10.4.2 | MIT | [testing-library.com](https://testing-library.com/) |
| `@testing-library/jest-dom` | 7.0.1 | MIT | [testing-library.com](https://testing-library.com/) |
| `@testing-library/user-event` | 14.6.8 | MIT | [testing-library.com](https://testing-library.com/) |
| `@types/node` | 26.6.5 | MIT | [github.com/DefinitelyTyped/DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `@types/papaparse` | 5.5.2 | MIT | [github.com/DefinitelyTyped/DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `@types/react` | 19.3.0 | MIT | [github.com/DefinitelyTyped/DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |
| `@types/react-dom` | 19.3.0 | MIT | [github.com/DefinitelyTyped/DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) |

## Fonts

Both fonts are self-hosted: the [Fontsource](https://fontsource.org/)
packages below bundle the font files into the build, so neither the
website nor the apps request fonts from Google Fonts or any other CDN.

| Package | Version | License | Link |
|---|---|---|---|
| `@fontsource-variable/geist` | 5.3.0 | OFL-1.1 | [fontsource.org/fonts/geist](https://fontsource.org/fonts/geist) |
| `@fontsource-variable/jetbrains-mono` | 5.3.0 | OFL-1.1 | [fontsource.org/fonts/jetbrains-mono](https://fontsource.org/fonts/jetbrains-mono) |

- **Geist** (headings and body text) — SIL Open Font License 1.1 — [vercel.com/font](https://vercel.com/font)
- **JetBrains Mono** (code and labels) — SIL Open Font License 1.1 — [jetbrains.com/lp/mono](https://www.jetbrains.com/lp/mono/)

## Third-party services (web build only)

The website at <https://jsonprism.poli0981.dev> uses the Cloudflare
services below. The desktop (Windows, macOS, Linux) and Android apps don't
include any of them. The JSON you convert never reaches them: conversion
runs on your device.

| Service | What JSONPrism uses it for | What it processes | Documentation |
|---|---|---|---|
| **Cloudflare Workers** | Hosting: serves the site from `dist/` and runs the small Worker in `worker/` for `/api/*` (Turnstile verification, health check). | Standard request data (IP address, user agent, requested URL) to deliver and protect the site. The Worker's own logs contain no IP addresses, tokens or user content. | [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/) |
| **Cloudflare Turnstile** | Human check inside the first-launch consent screen, verified server-side by the Worker. A pass is remembered on the device for 7 days. | Browser signals collected by Cloudflare's widget script to tell people from bots. The Worker does not send the visitor's IP address when it verifies a token. | [developers.cloudflare.com/turnstile](https://developers.cloudflare.com/turnstile/) · [Turnstile Privacy Addendum](https://www.cloudflare.com/turnstile-privacy-policy/) |
| **Cloudflare Web Analytics** | Cookieless page-view counts. Loaded only on the production site, only after the consent screen is accepted, and only while *Appearance → Anonymous usage analytics* is on (off by default when the browser sends Global Privacy Control). | Page path, referrer, browser and device type, and load-performance timings. No cookies or local storage; never editor content. | [developers.cloudflare.com/web-analytics](https://developers.cloudflare.com/web-analytics/) |

Cloudflare processes this data under the
[Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/).
How JSONPrism itself handles data is described in [PRIVACY.md](PRIVACY.md).

## Icon

The JSONPrism brand icon at `src-tauri/icons/icon.svg` is original
artwork by Kokone, licensed under the same Apache 2.0 terms as the rest
of the project.

## AI assistance

Substantial portions of JSONPrism's code, tests, translations, and docs
were drafted with AI assistance from Anthropic: **Claude Chat** +
**Claude Code** with Claude Opus 4.7 and 4.8 for the 1.x releases, and
**Claude Code** with Claude Opus 5.5 for 2.0.0. The Japanese and Simplified
Chinese translations, and parts of the Vietnamese one, are AI-generated.
The maintainer reviews every change before it is merged. See
[DISCLAIMER.md](DISCLAIMER.md).

## Copyright and takedown

If you believe JSONPrism uses your work without a compatible license or
proper attribution, or a notice on this page is missing or wrong, write to
**copyright@poli0981.dev**. [TERMS.md](TERMS.md) describes what to include
in a copyright complaint.
