# Privacy policy

**Last updated**: 2026-05-13

## Short version

**JSONPrism does not collect, transmit, or store your data on any server.**
Everything happens in your browser (or inside the Tauri desktop bundle).
There is no analytics, no telemetry, no tracking, no account system, no
"cloud sync." This page exists to explain what *does* happen locally and
why.

## What we run on

| Surface | Hosting | What it can see |
|---|---|---|
| Web app | [GitHub Pages](https://pages.github.com/) (static hosting only) | Standard request logs at the GitHub layer — IP, user-agent, requested asset. JSONPrism has no server code with access to those. |
| Desktop app | Tauri 2 bundle, runs locally | No network calls from app code. Only the OS file dialogs you trigger. |

Neither surface phones home about how you use the app.

## What we store locally

The app uses `localStorage` to remember your preferences across reloads.
These keys are written by JSONPrism:

| Key | What it stores |
|---|---|
| `jsonprism.theme` | `light` / `dark` / `system` |
| `jsonprism.lang` | UI language code (`en` / `vi` / `ja` / `zh-CN`) |
| `jsonprism.selected_format` | The target format chip you last selected |
| `jsonprism.direction` | Conversion direction (`forward` / `reverse`) |
| `jsonprism.options.<format>` | Per-format options (e.g. CSV header on/off) |
| `jsonprism.consent` | That you accepted the License / Terms / Privacy / Disclaimer (acceptance flag + version + timestamp). Web only — the desktop app gates this in its installer. |

That is the entire on-disk footprint. Clearing your browser's site data
removes everything. Nothing leaves your device.

## What JSONPrism never does

- No analytics SDK (no Google Analytics, no Plausible, no PostHog, etc.).
- No remote error reporting (no Sentry, no Rollbar).
- No CDN that proxies your content — assets are served directly from
  GitHub Pages.
- No login or account.
- No "cloud" backup, no clipboard upload, no diff-sharing.

## Tauri desktop specifics

- The Tauri bundle has filesystem access scoped to `$HOME`, `$DOCUMENT`,
  `$DOWNLOAD`, `$DESKTOP` only (see [`src-tauri/capabilities/default.json`](src-tauri/capabilities/default.json)).
- Drag-and-drop files come from the OS — JSONPrism reads their contents
  in-process and never writes them anywhere unless you explicitly hit
  "Download .zip" or "Save".
- The OS may write window-position / window-size metadata on shutdown
  (handled by Tauri, not by JSONPrism code).

## Third-party fonts

The web build loads three fonts from Google Fonts via `<link rel="preconnect">`:

- Geist (body)
- Instrument Serif (display)
- JetBrains Mono (code)

Google Fonts can see your IP when your browser fetches the font files.
The Tauri build inlines these fonts and never makes the request.

## Questions

Open a [GitHub Discussion](https://github.com/poli0981/jsonPrism/discussions) if anything here is unclear.
For security-relevant reports, use the [private Security Advisory flow](https://github.com/poli0981/jsonPrism/security/advisories/new).
