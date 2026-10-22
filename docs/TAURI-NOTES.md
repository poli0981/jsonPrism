# Tauri runtime notes

Operational notes for the desktop and Android builds. Aimed at maintainers, not end users.

## Versions

Tauri 2.12: `tauri` 2.12.5, `tauri-plugin-dialog` 2.8, `tauri-plugin-fs` 2.7,
`tauri-plugin-opener` 2.7 and, on desktop only, `tauri-plugin-single-instance`
2.5 (`src-tauri/Cargo.toml` / `Cargo.lock`), with `@tauri-apps/cli` 2.12 and the
matching `@tauri-apps/*` npm packages. Dependabot groups each side (npm `tauri`,
cargo `tauri`) so the plugin versions move together.

There is **no os plugin and no shell plugin**. The os plugin was removed in
2.0.0; the About page's "Copy diagnostics" gets OS and architecture from the
custom `host_info` command in `src-tauri/src/lib.rs`.

## Process lifecycle

`src-tauri/src/lib.rs` wires the hooks that keep the host process from
outliving the main webview:

- **Single instance (desktop only)** — `tauri-plugin-single-instance` is
  registered first; a second launch focuses the existing window instead of
  starting another process.
- `on_window_event` — when the main window receives `CloseRequested`, the
  app handle's `exit(0)` is called explicitly. This guards against Windows
  builds occasionally leaving `JSONPrism.exe` alive when the webview was
  the last live reference.
- `RunEvent::ExitRequested` — calls `app_handle.cleanup_before_exit()` so
  plugin and window resources are released before the process exits.

The app spawns no child processes. If you ever add one, track its handle and
kill it in the same hook.

## WebView2 GDI leak (Windows, upstream)

Microsoft Edge WebView2 — the runtime Tauri uses on Windows — leaks GDI
objects whenever the mouse hovers over the webview surface. Reported and
acknowledged by Microsoft:

- [WebView2Feedback #5536](https://github.com/MicrosoftEdge/WebView2Feedback/issues/5536) —
  ~2000 GDI objects leaked per 30 seconds of mouse movement.
- Toggling visibility (`SetIsVisible`) compounds the leak (~6000 obj/30s).
- The per-process GDI cap is 10 000 by default; the app eventually fails to
  draw and crashes once exhausted.

**This is not a JSONPrism bug.** The fix has to come from the WebView2
runtime team. Until then:

- Watch the GDI object count in Task Manager (View → Select Columns) during
  long sessions. Above ~8000 means a restart is overdue.
- For QA / release smoke tests, open and close the app five times in
  succession; verify no zombie `JSONPrism.exe` remains in Task Manager.

## Permissions / capabilities

`src-tauri/capabilities/default.json` applies to the `main` window. Scope is
intentionally narrow (trimmed in 2.0.0):

| Permission | Why |
| --- | --- |
| `core:default` | Tauri's core set (app, event, path, window, webview, …), including the `tauri://drag-drop` events. |
| `opener:default` | Opens `https://` and `mailto:` links in the system browser / mail app via `openUrl`. Works on Android, where the shell plugin's `open()` has no URL handler. |
| `dialog:allow-open`, `dialog:allow-save` | Native open / save dialogs only — no message, ask or confirm dialogs. |
| `fs:default` | The fs plugin's baseline: the app's own data directories; denies the webview data folder. |
| `fs:allow-read-text-file` | Read files the user picked or dropped. |
| `fs:allow-write-file` | Write the file the user chose in the save dialog (single output or batch `.zip`). |
| `fs:allow-stat` | Read a file's mtime so batch de-duplication stays stable. |
| `fs:scope` | Static scope: `$DOCUMENT/**`, `$DOWNLOAD/**`, `$DESKTOP/**` (no longer all of `$HOME`). |

- **Runtime scope.** Files the user picks in a dialog or drops onto the window
  are added to the fs scope at runtime by the plugins. That is how a file
  outside the three folders still opens, and how the save dialog can write
  where the user chose. Nothing else is reachable.
- **No dotfiles.** `plugins.fs.requireLiteralLeadingDot: true` in
  `tauri.conf.json`: scope globs never match dot-files or dot-directories such
  as `~/.ssh`.
- **Removed in 2.0.0:** the os plugin (`os:default`, `@tauri-apps/plugin-os`,
  `tauri-plugin-os`), `core:window:allow-set-title`, `dialog:default` and
  `dialog:allow-message`, `fs:allow-write-text-file`, and the `$HOME/**` scope.

Widening the scope requires both a capability edit and a CSP review in
`tauri.conf.json`.

## Content Security Policy

`app.security.csp` in `tauri.conf.json`:

```
default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' ipc: http://ipc.localhost; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

- 2.0.0 added `object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
- 2.0.1 added `'wasm-unsafe-eval'` to `script-src`: bson compiles a tiny WebAssembly helper for 64-bit math (it falls back to JavaScript when blocked, but every WebView logged a CSP violation).
- No third-party origins. Cloudflare Turnstile and Web Analytics are web-only
  and compiled out of Tauri builds (`__IS_TAURI_BUILD__`), so this CSP never
  needs their hosts. The web CSP lives in `public/_headers` — see
  [DEPLOYMENT.md](DEPLOYMENT.md).
- The theme is applied before first paint by `public/theme-init.js`, an
  external blocking script rather than an inline one, so neither CSP needs
  `'unsafe-inline'` for scripts (the reason is spelled out in `index.html`).

## Consent gate

The first-launch Consent Gate (License, Terms, Privacy Policy, Disclaimer)
shows on Android, macOS and Linux, as on the web. Windows skips it: the
installer's license page (`bundle.licenseFile` → `src-tauri/license.rtf`, in
both the NSIS `.exe` and the WiX `.msi`) already requires acceptance.
`CONSENT_VERSION` is 2 since 2.0.0, so existing users accept again. The
Turnstile check inside the gate exists only on the web.

## Version numbers

- `tauri.conf.json` has `"version": "../package.json"`: the bundle version
  comes from `package.json`.
- `src-tauri/Cargo.toml` keeps its own `version` (the `host_info` command
  reports it). Keep it equal to `package.json`; `release.yml` refuses a tag
  when they differ. CI runs clippy with `--locked`, so commit the refreshed
  `Cargo.lock` too.
- Android `versionCode` is still set by hand — see [versionCode](#versioncode).

## Bundle targets

- Windows: MSI (via WiX) + NSIS `.exe`. Tested on Windows 10 22H2 and
  Windows 11.
- macOS: universal (Apple Silicon + Intel) DMG + `.app` (published as
  `.app.tar.gz`), min version 12.0 (Monterey).
- Linux: AppImage, `.deb` and `.rpm`, built on Ubuntu 22.04 to keep the glibc
  floor low.
- Android: one universal APK — see [Android](#android-sideload-apk).

Bundles are not code-signed yet (`certificateThumbprint` and
`signingIdentity` are `null`), so expect Windows SmartScreen and macOS
Gatekeeper warnings on first launch. Signing is on the roadmap.

## Release workflow

`.github/workflows/release.yml` runs on a `v*` tag push, or by hand
(`workflow_dispatch`) with an existing tag to rebuild it:

1. **verify** — the tag must look like `vX.Y.Z` and match the `package.json`
   and `Cargo.toml` versions; then `npm test`.
2. **create-release** — creates **one** draft release, or reuses the existing
   draft; it refuses when the release is already published. (Parallel
   "find or create" calls used to race and split assets across drafts.)
3. **desktop** — matrix: Windows (`windows-latest`), macOS universal
   (`macos-14`, `--target universal-apple-darwin`), Linux (`ubuntu-22.04`).
   Each builds with `tauri-apps/tauri-action` v1 and uploads into the draft.
4. **android** — Java 17 (Temurin), SDK platform 36 + NDK `27.2.12479018`,
   Rust Android targets; signs with the release keystore from secrets and
   uploads `JSONPrism_<version>_android-universal.apk` (1.7.x used
   `JSONPrism-v<version>-android-universal.apk`).
5. **checksums** — downloads every asset, uploads `SHA256SUMS.txt` and creates
   GitHub build-provenance attestations for each file.

The maintainer reviews and publishes the draft; publishing triggers the
Discord and GitHub Discussions announcements. Anyone can check a download:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
gh attestation verify <file> --repo poli0981/jsonPrism
```

Every action is pinned to a full commit SHA, checkouts use
`persist-credentials: false`, each job declares only the permissions it
needs, and installs run `npm ci --ignore-scripts`. The step-by-step release
checklist is in [DEPLOYMENT.md](DEPLOYMENT.md#releases-desktop--android).

## Android (sideload APK)

JSONPrism ships an Android APK that users sideload. **Minimum Android 12
(API 31)** — set via `bundle.android.minSdkVersion` in `tauri.conf.json`; the
OS installer refuses older devices. The build target is a **universal APK**
(all ABIs in one file) so users only ever download one `.apk`.

### Toolchain (local, Windows)

Environment variables Tauri's CLI reads:

- `JAVA_HOME` → a JDK 17 or newer, e.g. Android Studio's JBR at
  `C:\Jetbrains\Android Studio\jbr` (CI uses Temurin 17)
- `ANDROID_HOME` → `C:\Users\<you>\AppData\Local\Android\Sdk`, with SDK
  Platform 36 (`compileSdk` / `targetSdk` 36), Build-Tools, Platform-Tools and
  Command-line Tools installed
- `NDK_HOME` → `…\Android\Sdk\ndk\<version>`

Rust targets: `rustup target add aarch64-linux-android armv7-linux-androideabi
i686-linux-android x86_64-linux-android`. Verify with `npm run tauri info`.

> **NDK selection.** The CLI auto-picks the **highest** NDK under
> `$ANDROID_HOME/ndk`, regardless of `NDK_HOME`. If you keep multiple NDKs and
> want a specific one, leave only that version installed. Builds are validated
> against NDK r27+; CI pins `ndk;27.2.12479018`.

### The `gen/android` project

`src-tauri/gen/android/` (the Gradle project from `tauri android init`) is
**committed** — source only. Its nested `.gitignore` files exclude build
outputs (`build/`, `.gradle/`, `.cxx/`, `*.so`, `local.properties`,
`keystore.properties`). Committing it keeps the signing edits in
`app/build.gradle.kts`, `minSdkVersion` and the manifest stable, and makes CI
reproducible.

`app/src/main/AndroidManifest.xml` sets `android:allowBackup="false"` (since
2.0.0), so the app's data — WebView storage such as consent, theme and saved
options — is left out of Android's cloud backup.

You normally do **not** run `tauri android init` again. Only re-run it after a
major `@tauri-apps/cli` bump, and afterwards re-apply the signing block, verify
`minSdk = 31` in `app/build.gradle.kts` and check that `allowBackup="false"` is
still in the manifest (the init overwrites them).

Launcher icons (`res/mipmap-*/ic_launcher*.png`) are generated by
`npm run tauri:icon` and gitignored, like the desktop icons — both the local
`tauri:android:build` script and CI regenerate them before building.

### versionCode

`bundle.android.versionCode` in `tauri.conf.json` must increase monotonically
(needed for in-place upgrades). Derive it deterministically from semver:

```
versionCode = MAJOR*10000 + MINOR*100 + PATCH
```

e.g. `1.7.2 → 10702`, `2.0.0 → 20000`. Set it by hand at release time, together
with `version` in `package.json` and `Cargo.toml` (`tauri.conf.json` reads its
version from `package.json`). `release.yml` checks the version strings, not
`versionCode`.

### Signing

Release signing is read from `src-tauri/gen/android/keystore.properties`
(gitignored), which points at a keystore `.jks` (also gitignored, kept outside
the repo). If the file is absent the release variant builds **unsigned** — fine
for contributors, but a release APK must be signed so it installs and so future
versions can upgrade in place.

Generate a keystore once:

```powershell
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v `
  -keystore "$env:USERPROFILE\jsonprism-upload-keystore.jks" -storetype JKS `
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

Then create `src-tauri/gen/android/keystore.properties`:

```
storePassword=…
keyPassword=…
keyAlias=upload
storeFile=C:/Users/<you>/jsonprism-upload-keystore.jks
```

> Use forward slashes in `storeFile` — `.properties` treats `\` as an escape.
> **Back up the `.jks` and its passwords** (password manager). Losing the key
> means users can no longer upgrade in place — they'd have to uninstall first.

### CI signing secrets

The `android` job in `release.yml` needs these repository secrets:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | base64 of the `.jks` (required) |
| `ANDROID_KEYSTORE_PASSWORD` | the store password (required) |
| `ANDROID_KEY_PASSWORD` | the key password (optional; defaults to store password) |
| `ANDROID_KEY_ALIAS` | the alias (optional; defaults to `upload`) |

Produce the base64 (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\jsonprism-upload-keystore.jks")) | Set-Clipboard
```

CI decodes it to a temp path, writes `keystore.properties`, builds with
`tauri android build --apk`, and uploads the universal APK to the same draft
release as the desktop bundles, named `JSONPrism_<version>_android-universal.apk`.
If `ANDROID_KEYSTORE_BASE64` is unset the job fails fast rather than shipping an
unsigned APK.

### Output

`src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`

### Offline fonts

Fonts (Geist and JetBrains Mono, variable builds) are self-hosted via
`@fontsource-variable/*` (imported in `src/main.tsx`), not loaded from Google
Fonts, so the app renders correctly offline. Instrument Serif was dropped in
2.0.0 because it has no Vietnamese glyphs; headings use Geist. The CSP in
`tauri.conf.json` does not allow the Google Fonts hosts — keep it that way
unless fonts move back to a CDN.

### WebView version requirement (important)

The Android app renders inside the device's **Android System WebView**, which is
Chromium. Tailwind v4 (our CSS) requires **Chromium ≥ 111** (`@layer`, `oklch()`,
`@property`). On an older WebView the layout breaks badly (giant icons, unhidden
elements, no responsive layout) even though the app installs and runs.

- Real Android 12+ devices keep WebView updated via Play Store → modern Chromium
  → renders correctly. This is the normal case.
- The bundled WebView in the **API 31 emulator system image is Chromium 91** and
  shows the broken layout. Use a newer emulator image (e.g. `android-34`+, which
  ships Chromium ≥ 120) or update the emulator's WebView via Play to test
  rendering. The `android-31` install/`minSdk` gate can still be tested on the
  stock API 31 image.

This is inherent to the Tailwind v4 stack (the web app has the same requirement);
it is not Android-specific code. No action needed unless you must support devices
with a very outdated WebView.

The JavaScript side keeps the same floor: since 2.0.0 the app compiles with an
ES2025 target but an **ES2023 `lib`**, so ES2025 runtime APIs (Iterator helpers,
Set methods, `Promise.try`, `RegExp.escape`) are compile errors. They are missing
on Chromium 111 and on macOS 12's WebKit.

### Native file I/O on Android

`plugin-dialog` `open()` returns a percent-encoded `content://` URI on Android
(not a filesystem path). `plugin-fs` `readTextFile()` reads it fine — validated on
an emulator for both URI flavours. `fileFromNativePath()` (`src/lib/tauri.ts`)
runs the URI through `basenameFromPath()` to recover a filename for the editor,
the extension filter, and toasts. `stat()` on a content URI is unreliable, so
`lastModified` falls back to a deterministic path hash — dedup still works.

Two URI flavours show up:
- **`raw:` URIs** (most local/Downloads files) embed the real path →
  `basenameFromPath()` recovers `data.json`.
- **`msf:` URIs** (MediaStore-indexed files) are opaque document ids with no
  filename → they collapse to a numeric id (e.g. `18`) and **carry no
  extension**. The native open path therefore filters leniently
  (`filterByExtension(..., true)` / the `extOf(name) && !allowed` guard in
  `InputPanel`) so a file the user explicitly picked is never wrongly rejected.
  The real display name would need a content-resolver `DISPLAY_NAME` query via a
  custom Rust command — not worth it; the file content loads correctly either way.

Saving goes through the native save dialog on desktop and Android
(`nativeSaveBlob()` → `plugin-fs` `writeFile`), for single outputs (Download,
Ctrl/⌘+S) and the batch `.zip` alike: Android WebViews ignore `<a download>`
blob links. Since 2.0.0 the open dialogs filter by conversion direction: `.json`
when converting from JSON, and the source format's extensions, aliases included
(`.yml`, `.ndjson`), when converting back to JSON — which only JSONL, CSV, TSV,
YAML, TOML and RESX support. Both offer `.txt` as a fallback.
