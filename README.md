<div align="center">

# JSONPrism

**Disperse JSON into many formats.**

One JSON input. Multi-target formats. Fully in your browser.

[![CI](https://github.com/poli0981/jsonPrism/actions/workflows/ci.yml/badge.svg)](https://github.com/poli0981/jsonPrism/actions/workflows/ci.yml)
[![Deploy](https://github.com/poli0981/jsonPrism/actions/workflows/deploy.yml/badge.svg)](https://github.com/poli0981/jsonPrism/actions/workflows/deploy.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

[Live demo](https://poli0981.github.io/jsonPrism/) · [Tiếng Việt](README.vi.md) · [Roadmap](docs/ROADMAP.md)

</div>

---

JSONPrism is a refracting tool for developers. It takes a single JSON input and disperses it into many target formats — like white light through a prism. **Everything runs client-side**, so your data never leaves your device.

## Target formats

| Format            | Extension   | Status        | Reverse (→ JSON) |
| ----------------- | ----------- | ------------- | ---------------- |
| JSONL             | `.jsonl`    | ✅ Phase 1     | ✅                |
| CSV               | `.csv`      | ✅ Phase 1     | ✅                |
| TSV               | `.tsv`      | ✅ Phase 1     | ✅                |
| YAML              | `.yaml`     | ✅ Phase 1     | ✅                |
| XML               | `.xml`      | ✅ Phase 2     | —                |
| TOML              | `.toml`     | ✅ Phase 2     | ✅                |
| Markdown table    | `.md`       | ✅ Phase 2     | —                |
| SQL `INSERT`      | `.sql`      | ✅ Phase 2     | —                |
| RESX (.NET)       | `.resx`     | ✅ Phase 3     | ✅                |
| BSON              | `.bson`     | ✅ Phase 4     | —                |
| CBOR              | `.cbor`     | ✅ Phase 4     | —                |
| MessagePack       | `.msgpack`  | ✅ Phase 4     | —                |

## Features

- **Client-side only** — no server, no telemetry, no upload. Your JSON stays in your browser.
- **Batch processing** — up to 500 files at once (Phase 2).
- **Smart shape detection** — recognizes flat objects, arrays of objects, scalars; suggests the best target format.
- **Per-format options** — pretty-print, indentation, dialect (for SQL), alignment (for Markdown), and more.
- **Dark + light themes** — Prism Spectrum palette with violet / cyan / amber / rose accents.
- **Responsive — designed for viewports ≥ 360 × 640.** Smaller screens still work but may feel cramped; on mobile, Input and Output use a Tabs UI to give each panel full height.
- **EN + VI** — bilingual interface out of the box. More languages welcome.
- **Tauri desktop build** — drag-and-drop file workflow, offline-first (Phase 2 milestone).

## Tech stack

- **Vite 8** + **React 19** + **TypeScript 5.7**
- **Tailwind CSS v4** + **shadcn/ui** (New York style, neutral base)
- **CodeMirror 6** for the input editor (Phase 1 polish)
- **PapaParse**, **js-yaml**, **smol-toml**, **fast-xml-parser** for parsing/serialization
- **i18next** for translations, **Zustand** for state, **Sonner** for toasts
- **Tauri 2** wrapper (Phase 2)

## Quick start

**Requirements**: Node.js **22 LTS** or newer.

```bash
git clone https://github.com/poli0981/jsonPrism.git
cd jsonprism
npm install
npm run dev          # http://localhost:5173
```

## Desktop app (Tauri 2)

JSONPrism also ships as a native desktop app via Tauri 2. The app uses the same React UI, with native OS dialogs and drag-drop hooked into the existing batch flow.

**Additional requirements**:

- **Rust toolchain** (`rustup`) with the stable channel
- **Platform build deps**:
  - **Windows**: Visual Studio Build Tools (C++ workload) + WebView2 (preinstalled on Windows 11)
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`, `libssl-dev`

**Generate icons once** (uses Tauri's CLI to render the SVG to PNG/ICO/ICNS):

```bash
npm run tauri:icon
```

**Run in dev mode** (Vite + Tauri window with hot reload):

```bash
npm run tauri:dev
```

**Build native bundles**:

```bash
npm run tauri:build
```

Output:

- Windows → `src-tauri/target/release/bundle/msi/*.msi` + `nsis/*-setup.exe`
- macOS → `src-tauri/target/release/bundle/dmg/*.dmg` + `macos/*.app`
- Linux → `src-tauri/target/release/bundle/appimage/*.AppImage` + `deb/*.deb`

**Automated releases**: pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds for all platforms in parallel and creates a draft GitHub release.

### Scripts

| Script                | What it does                                  |
| --------------------- | --------------------------------------------- |
| `npm run dev`         | Start Vite dev server with HMR               |
| `npm run build`       | Production build to `dist/`                  |
| `npm run preview`     | Preview the built site locally               |
| `npm run lint`        | Run ESLint                                   |
| `npm run lint:fix`    | Run ESLint with autofix                      |
| `npm run typecheck`   | TypeScript type-check, no emit               |
| `npm run format`      | Format with Prettier                         |
| `npm run format:check`| Check formatting (CI uses this)              |

### shadcn/ui components

The `components.json` is preconfigured. Add components on demand:

```bash
npx shadcn@latest add button input textarea tabs select card dialog sheet \
  dropdown-menu switch badge progress tooltip sonner resizable
```

## Architecture

```
src/
├── app/                 # Router + global providers
├── components/
│   ├── ui/              # shadcn components (added on demand)
│   ├── layout/          # Header, Footer, ThemeToggle
│   ├── converter/       # Workspace, panels, format picker
│   └── common/          # ErrorBoundary, LanguageSwitcher
├── converters/          # One module per target format
│   ├── types.ts         # Converter interface
│   ├── registry.ts      # Lookup table
│   └── *.ts             # Per-format implementations
├── hooks/               # Custom hooks
├── i18n/                # Translations (en, vi)
├── lib/                 # detect, theme, utils, sample
├── pages/               # Home, About
├── styles/              # globals.css (Tailwind + theme tokens)
└── main.tsx
```

### Adding a new format

Each format is a self-contained module implementing the `Converter` interface:

```ts
import type { Converter } from './types';

interface MyFormatOptions {
  indent: 2 | 4;
}

export const myFormatConverter: Converter<MyFormatOptions> = {
  meta: {
    id: 'myformat',
    labelKey: 'formats.myformat',
    extension: 'myf',
    mimeType: 'application/x-myformat',
    phase: 1,
    ready: true,
  },
  defaultOptions: { indent: 2 },
  convert({ data }, options) {
    try {
      const output = serialize(data, options);
      return { ok: true, output };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};
```

Then register it in `src/converters/registry.ts` and add label keys to `src/i18n/locales/*.json`.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the full phase plan.

## Contributing

Pull requests welcome — please read [`CONTRIBUTING.md`](CONTRIBUTING.md) first. PRs that match the **auto-ignored** patterns described there (suspicious code, off-topic preamble, no description, etc.) get closed without review.

For bug reports and feature requests, use [GitHub Issues](https://github.com/poli0981/jsonPrism/issues). For security vulnerabilities, use the [private Security Advisory flow](https://github.com/poli0981/jsonPrism/security/advisories/new).

## Project docs

| Doc | What's in it |
|---|---|
| [`PRIVACY.md`](PRIVACY.md) | Offline-first, localStorage-only, no telemetry. |
| [`TERMS.md`](TERMS.md) | ToS / EULA — acceptable use, license inheritance, user data ownership. |
| [`SECURITY.md`](SECURITY.md) | How to report vulnerabilities; response SLAs. |
| [`DISCLAIMER.md`](DISCLAIMER.md) | One-person + AI-assisted project; no warranty. |
| [`THIRD-PARTY.md`](THIRD-PARTY.md) | Every dependency: version, license, link. |
| [`MAINTAINERS.md`](MAINTAINERS.md) | Who's responsible for what. |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Contributor Covenant v2.1. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase plan, current status. |
| [`docs/pc_spec.md`](docs/pc_spec.md) · [`docs/dev_env.md`](docs/dev_env.md) | Maintainer's hardware + toolchain. |
| [`docs/TAURI-NOTES.md`](docs/TAURI-NOTES.md) | Tauri build / process notes. |
| [`docs/RESX-MIGRATION.md`](docs/RESX-MIGRATION.md) | i18next JSON → .NET RESX tutorial. |

## Community

Hang out, ask questions, or follow updates:

- [Discord — dev community](https://discord.gg/2aNR3aVt)
- [X (Twitter) — @SkullMute0011](https://twitter.com/SkullMute0011)
- [Bluesky — @skullmute0011.bsky.social](https://bsky.app/profile/skullmute0011.bsky.social)
- [Mastodon — @skullmute1122@mastodon.social](https://mastodon.social/@skullmute1122)
- [Telegram — @SkullMute0011](https://t.me/SkullMute0011)
- [YouTube — @SkullMute](https://youtube.com/@SkullMute)

## Acknowledgements

Substantial parts of JSONPrism's code, tests, translations, and docs
were drafted with **Claude Chat** and **Claude Code (Opus 4.7, 1M
context)**. See [DISCLAIMER.md](DISCLAIMER.md) for the full AI-assist
disclosure. Translation quality for non-English locales is best-effort
and contributions from native speakers are welcomed.

## Sponsorship

If JSONPrism is useful to you, consider sponsoring the maintainer via
any of the channels in [`.github/FUNDING.yml`](.github/FUNDING.yml):
GitHub Sponsors, Ko-fi, Buy Me a Coffee, Patreon, or PayPal.

## License

[Apache License 2.0](LICENSE) — © 2026 Kokone ([@poli0981](https://github.com/poli0981)).
