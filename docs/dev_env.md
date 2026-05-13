# Developer environment

This is the toolchain the maintainer keeps installed for JSONPrism +
sibling projects. It is **not** a strict requirement for contributing —
most contributors only need the **Web app** column.

## Required for the web app

| Tool | Minimum | Latest exercised | Notes |
|---|---|---|---|
| **Node.js** | 22.11.0 LTS | 25.8.1 | Set in [package.json](../package.json) `engines.node`. |
| **npm** | bundled with Node | — | `npm ci` is what CI runs. |
| **Git** | recent (≥ 2.40) | — | Commit signing (`commit.gpgsign=true`) recommended. |

## Required for the Tauri desktop build

In addition to the web app deps:

| Tool | Minimum | Notes |
|---|---|---|
| **Rust** | 1.77 (per `Cargo.toml`) | Install via `rustup`; stable channel. |
| **Platform build deps** | OS-specific | See `README.md` § Desktop app for the full list. |

## Other tooling on the maintainer's machine

These are unrelated to JSONPrism but documented so anyone reproducing
the broader dev environment knows what's around:

- **Python**: 3.12.x, 3.14.x (used for adjacent scripting projects).
- **.NET**: 8.x, 9.x, 10.x, 11.x (preview) — for sibling AutoClickForge / PhantomMAC projects.
- **GPG**: commit signing enabled (`commit.gpgsign=true`).

## IDEs

- **JetBrains** WebStorm (2026.x) — primary IDE; runs Prettier + ESLint on save.
- **Visual Studio Code** — secondary; useful for the Tauri/Rust side via `rust-analyzer`.

## Recommended workflow

```bash
# One-time
git clone https://github.com/poli0981/jsonPrism.git
cd jsonprism
npm install

# Daily
npm run dev              # web dev server, http://localhost:5173

# Before pushing
npm run format
npm run typecheck
npm run lint
npm test
npm run build
```

## Related docs

- [docs/pc_spec.md](pc_spec.md) — hardware reference.
- [docs/TAURI-NOTES.md](TAURI-NOTES.md) — Tauri-specific notes.
- [README.md](../README.md) — project overview + quick start.
- [Tiếng Việt](i18n/vi/dev_env.md)
