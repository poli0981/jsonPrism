# Third-party notice

JSONPrism is built on top of open-source libraries. This page lists each
direct dependency, the version pinned in [`package.json`](package.json) and
[`src-tauri/Cargo.toml`](src-tauri/Cargo.toml), the upstream license, and a
link to the project.

Versions reflect the `^` semver range — exact installed versions appear
in [`package-lock.json`](package-lock.json) and `src-tauri/Cargo.lock`.

If you are bundling JSONPrism into a derived work, the Apache 2.0
license inherited from the upstream packages requires that you reproduce
the relevant notices. This file is a starting point.

---

## UI framework

| Package | Version | License | Link |
|---|---|---|---|
| `react` | ^19.0.0 | MIT | [react.dev](https://react.dev/) |
| `react-dom` | ^19.0.0 | MIT | [react.dev](https://react.dev/) |
| `react-router-dom` | ^7.0.0 | MIT | [reactrouter.com](https://reactrouter.com/) |
| `tailwindcss` | ^4.0.0 | MIT | [tailwindcss.com](https://tailwindcss.com/) |
| `tw-animate-css` | ^1.2.0 | MIT | [github.com/Wombosvideo/tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) |
| `tailwind-merge` | ^2.5.0 | MIT | [github.com/dcastil/tailwind-merge](https://github.com/dcastil/tailwind-merge) |
| `class-variance-authority` | ^0.7.0 | Apache-2.0 | [cva.style](https://cva.style/) |
| `clsx` | ^2.1.0 | MIT | [github.com/lukeed/clsx](https://github.com/lukeed/clsx) |
| `@radix-ui/react-dialog` | ^1.1.0 | MIT | [radix-ui.com](https://www.radix-ui.com/) |
| `@radix-ui/react-slot` | ^1.1.0 | MIT | [radix-ui.com](https://www.radix-ui.com/) |
| `@radix-ui/react-switch` | ^1.1.0 | MIT | [radix-ui.com](https://www.radix-ui.com/) |
| `@radix-ui/react-tabs` | ^1.1.0 | MIT | [radix-ui.com](https://www.radix-ui.com/) |
| `lucide-react` | ^0.460.0 | ISC | [lucide.dev](https://lucide.dev/) |
| `sonner` | ^2.0.7 | MIT | [sonner.emilkowal.ski](https://sonner.emilkowal.ski/) |
| `react-dropzone` | ^14.3.0 | MIT | [react-dropzone.js.org](https://react-dropzone.js.org/) |

The component patterns under `src/components/ui/` are generated from
**[shadcn/ui](https://ui.shadcn.com/)** (MIT) — copied into the repo, not
installed as a runtime dependency.

## Code editor

| Package | Version | License | Link |
|---|---|---|---|
| `@uiw/react-codemirror` | ^4.23.0 | MIT | [uiwjs.github.io/react-codemirror](https://uiwjs.github.io/react-codemirror/) |
| `@codemirror/state` | ^6.4.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/view` | ^6.34.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/language` | ^6.10.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-json` | ^6.0.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-yaml` | ^6.1.3 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-xml` | ^6.1.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-markdown` | ^6.5.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lang-sql` | ^6.10.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/legacy-modes` | ^6.5.2 | MIT | [codemirror.net](https://codemirror.net/) |
| `@codemirror/lint` | ^6.8.0 | MIT | [codemirror.net](https://codemirror.net/) |
| `@lezer/highlight` | ^1.2.0 | MIT | [lezer.codemirror.net](https://lezer.codemirror.net/) |

## Parsers / serialization

| Package | Version | License | Link |
|---|---|---|---|
| `papaparse` | ^5.4.0 | MIT | [papaparse.com](https://www.papaparse.com/) |
| `js-yaml` | ^4.1.0 | MIT | [github.com/nodeca/js-yaml](https://github.com/nodeca/js-yaml) |
| `smol-toml` | ^1.3.0 | BSD-3-Clause | [github.com/squirrelchat/smol-toml](https://github.com/squirrelchat/smol-toml) |
| `fast-xml-parser` | ^5.8.0 | MIT | [github.com/NaturalIntelligence/fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) |
| `bson` | ^7.2.0 | Apache-2.0 | [github.com/mongodb/js-bson](https://github.com/mongodb/js-bson) |
| `cbor-x` | ^1.6.4 | MIT | [github.com/kriszyp/cbor-x](https://github.com/kriszyp/cbor-x) |
| `@msgpack/msgpack` | ^3.1.3 | ISC | [msgpack.org/javascript](https://msgpack.org/) |
| `fflate` | ^0.8.2 | MIT | [github.com/101arrowz/fflate](https://github.com/101arrowz/fflate) |

## State & i18n

| Package | Version | License | Link |
|---|---|---|---|
| `zustand` | ^5.0.0 | MIT | [github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) |
| `i18next` | ^23.0.0 | MIT | [i18next.com](https://www.i18next.com/) |
| `react-i18next` | ^15.0.0 | MIT | [react.i18next.com](https://react.i18next.com/) |
| `i18next-browser-languagedetector` | ^8.0.0 | MIT | [github.com/i18next/i18next-browser-languageDetector](https://github.com/i18next/i18next-browser-languageDetector) |

## Tauri (desktop)

| Package | Version | License | Link |
|---|---|---|---|
| `@tauri-apps/api` | ^2.0.0 | Apache-2.0 OR MIT | [tauri.app](https://tauri.app/) |
| `@tauri-apps/plugin-dialog` | ^2.0.0 | Apache-2.0 OR MIT | [tauri.app](https://tauri.app/) |
| `@tauri-apps/plugin-fs` | ^2.0.0 | Apache-2.0 OR MIT | [tauri.app](https://tauri.app/) |
| `@tauri-apps/plugin-os` | ^2.0.0 | Apache-2.0 OR MIT | [tauri.app](https://tauri.app/) |
| `@tauri-apps/plugin-shell` | ^2.0.0 | Apache-2.0 OR MIT | [tauri.app](https://tauri.app/) |
| `@tauri-apps/cli` (devDep) | ^2.0.0 | Apache-2.0 OR MIT | [tauri.app](https://tauri.app/) |

### Rust crates (`src-tauri/Cargo.toml`)

| Crate | Version | License | Link |
|---|---|---|---|
| `tauri` | 2 | Apache-2.0 OR MIT | [crates.io/crates/tauri](https://crates.io/crates/tauri) |
| `tauri-build` | 2 | Apache-2.0 OR MIT | [crates.io/crates/tauri-build](https://crates.io/crates/tauri-build) |
| `tauri-plugin-dialog` | 2 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-dialog](https://crates.io/crates/tauri-plugin-dialog) |
| `tauri-plugin-fs` | 2 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-fs](https://crates.io/crates/tauri-plugin-fs) |
| `tauri-plugin-os` | 2 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-os](https://crates.io/crates/tauri-plugin-os) |
| `tauri-plugin-shell` | 2 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-shell](https://crates.io/crates/tauri-plugin-shell) |
| `tauri-plugin-single-instance` | 2 | Apache-2.0 OR MIT | [crates.io/crates/tauri-plugin-single-instance](https://crates.io/crates/tauri-plugin-single-instance) |
| `serde` | 1 | Apache-2.0 OR MIT | [serde.rs](https://serde.rs/) |
| `serde_json` | 1 | Apache-2.0 OR MIT | [github.com/serde-rs/json](https://github.com/serde-rs/json) |

## Build tooling

| Package | Version | License | Link |
|---|---|---|---|
| `vite` | ^8.0.0 | MIT | [vite.dev](https://vite.dev/) |
| `@vitejs/plugin-react` | ^6.0.0 | MIT | [github.com/vitejs/vite-plugin-react](https://github.com/vitejs/vite-plugin-react) |
| `@tailwindcss/vite` | ^4.0.0 | MIT | [tailwindcss.com](https://tailwindcss.com/) |
| `typescript` | ^5.7.0 | Apache-2.0 | [typescriptlang.org](https://www.typescriptlang.org/) |
| `eslint` | ^9.15.0 | MIT | [eslint.org](https://eslint.org/) |
| `typescript-eslint` | ^8.15.0 | MIT, BSD-2-Clause | [typescript-eslint.io](https://typescript-eslint.io/) |
| `eslint-plugin-react-hooks` | ^5.0.0 | MIT | [github.com/facebook/react](https://github.com/facebook/react) |
| `eslint-plugin-react-refresh` | ^0.4.0 | MIT | [github.com/ArnaudBarre/eslint-plugin-react-refresh](https://github.com/ArnaudBarre/eslint-plugin-react-refresh) |
| `prettier` | ^3.4.0 | MIT | [prettier.io](https://prettier.io/) |
| `prettier-plugin-tailwindcss` | ^0.6.0 | MIT | [github.com/tailwindlabs/prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss) |
| `vitest` | ^4.1.6 | MIT | [vitest.dev](https://vitest.dev/) |
| `@vitest/coverage-v8` | ^4.1.6 | MIT | [vitest.dev](https://vitest.dev/) |
| `@testing-library/react` | ^16.1.0 | MIT | [testing-library.com](https://testing-library.com/) |
| `@testing-library/jest-dom` | ^6.6.0 | MIT | [testing-library.com](https://testing-library.com/) |
| `@testing-library/user-event` | ^14.5.0 | MIT | [testing-library.com](https://testing-library.com/) |
| `jsdom` | ^29.0.0 | MIT | [github.com/jsdom/jsdom](https://github.com/jsdom/jsdom) |

## Fonts

Served via Google Fonts on the web build, inlined into Tauri build:

- **Geist** — SIL Open Font License 1.1 — [vercel.com/font](https://vercel.com/font)
- **Instrument Serif** — SIL Open Font License 1.1 — [github.com/Instrument/instrument-serif](https://github.com/Instrument/instrument-serif)
- **JetBrains Mono** — SIL Open Font License 1.1 — [jetbrains.com/lp/mono](https://www.jetbrains.com/lp/mono/)

## Icon

The JSONPrism brand icon at `src-tauri/icons/icon.svg` is original
artwork by Kokone, licensed under the same Apache 2.0 terms as the rest
of the project.

## Acknowledgements

Substantial portions of JSONPrism's code, tests, translations, and docs
were drafted with **Claude Chat** + **Claude Code (Opus 4.7, 1M
context)** from Anthropic. See [DISCLAIMER.md](DISCLAIMER.md).
