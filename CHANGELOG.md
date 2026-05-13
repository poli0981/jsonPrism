# Changelog

All notable changes to JSONPrism are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

No unreleased changes at this time. Future work tracked in `docs/ROADMAP.md` under "Beyond Phase 3".

## [1.3.3] — 2026-05-13

### Fixed

- **Tauri native drag-drop / file picker bỏ qua batch dedup**. v1.3.0–v1.3.2 desktop bundles cho phép drop cùng một file vào queue nhiều lần mà không hiển thị toast `duplicate`. Root cause: `fileFromNativePath` tạo `new File([text], name, { type })` không truyền `lastModified`, nên File API default về `Date.now()` mỗi lần gọi; key dedup của `batchStore` (`name|size|lastModified`) khác nhau giữa các lần drop cùng một file. Sửa: stat file qua `@tauri-apps/plugin-fs` để lấy mtime thật, fall back về hash FNV-1a của path nếu stat fail. Bonus: infer `type` từ extension thay vì hard-code `application/json`. Thêm permission `fs:allow-stat` vào default capability.

### Tests

- 3 unit test mới cho `pathHashAsMillis` trong `src/lib/__tests__/tauri.test.ts`. Total tests: **193**.

## [1.3.2] — 2026-05-13

### Fixed

- **Tauri native drag-drop bypassed the batch extension filter**. v1.3.0/v1.3.1 desktop bundles accepted any file dropped from File Explorer / Finder / Nautilus into the workspace, because `ConverterWorkspace.handleMultiFileDrop` called `batchStore.addFiles` directly — skipping the `direction × format` extension whitelist that the web `react-dropzone` path enforced. Files like `.cs`/`.py` leaked into the queue with no warning. Extracted `src/lib/file-filter.ts` (`getAllowedExtensions` + `extOf` + `filterByExtension`) and routed the Tauri callback, `BatchPanel`, and `InputPanel` through it so the wrong-format toast surfaces in all three entry points.

### Tests

- 7 new unit tests for `getAllowedExtensions`, `extOf`, and `filterByExtension` in `src/lib/__tests__/file-filter.test.ts`. Total tests: **190**.

## [1.3.1] — 2026-05-13

### Fixed

- **GitHub Pages deploy 404**. The deployed page rendered blank because every asset URL 404'd. Root cause: GitHub Pages serves at `https://poli0981.github.io/jsonPrism/` (case-sensitive, mirrors the repo name), but Vite `base` was `/jsonprism/` (lowercase), so `index.html` referenced `/jsonprism/assets/*.js`. Rebased Vite `base`, React Router basename, and all GitHub URLs in code/docs to match the existing repo case `jsonPrism`. Storage keys / package name / Tauri identifier remain lowercase.
- **Release workflow macOS Intel build cancelled**. GitHub Actions `macos-13` runners no longer pick up jobs (jobs queue indefinitely then auto-cancel after timeout). Replaced the two-entry macOS matrix (Apple Silicon + Intel) with a single `macos-14` build using `--target universal-apple-darwin`. The resulting `.dmg` / `.app` runs on both Apple Silicon and Intel via the universal2 binary.

### Note on v1.3.0

The v1.3.0 tag was published with a draft GitHub Release containing partial bundles (Windows + macOS Apple Silicon + Linux; macOS Intel missing). It was never un-drafted because of the two bugs above. v1.3.1 carries the same feature set plus the fixes — please use v1.3.1.

## [1.3.0] — 2026-05-13

### Added — Đợt sửa lỗi 4: editor UX, batch hygiene, workspace persistence, TERMS

- **Reverse-mode syntax highlighting** in the input editor — YAML and XML/RESX now get proper token colors via `@codemirror/lang-yaml` and `@codemirror/lang-xml`; CSV/TOML/JSONL/Markdown/SQL/BSON/CBOR/MessagePack fall back to plain text (no upstream grammar).
- **Workspace state persistence**: Convert → About → Convert no longer wipes the editor. New `src/stores/workspaceStore.ts` (Zustand) owns `input` + `format` + `direction` + `optionsByFormat`; `input` is in-memory only, the rest persist to localStorage via existing helpers.
- **Batch dedup** by `(filename + size + lastModified)` — re-dropping the same files reports a duplicate-skipped toast instead of double-queuing.
- **Batch format filter**: drag-drop, "Browse", and Tauri native dialog all reject files whose extension is outside the allowed list (`.json`/`.txt` forward; `<format>`/`.txt` reverse) with a warning toast. Files like `.cs` or `.py` no longer leak into the queue via "Browse".
- **`.scrollbar-hide` utility class** in `globals.css` — applied to `.cm-scroller` (CodeEditor theme), OutputPanel, and the About page wrapper. Window scrollbar untouched for a11y.
- **Direction-aware batch text**: `batch.description` interpolates `{{from}}`/`{{to}}` ("Process multiple YAML files into JSON…"); new `drop_idle_format` + `empty_format` use `{{format}}`. All four locales (en/vi/ja/zh-CN) updated.
- **`TERMS.md`** (root, ToS / EULA): acceptance, GitHub ToS compliance, Apache 2.0 inheritance, no warranty, user data ownership, acceptable use (anti-malware PR, no-PII-on-public-deploy, no Tauri capability bypass), trademarks, modifications, termination, contact. Linked from `README.md` and `README.vi.md`.

### Fixed

- **Input editor overflow**: long pastes now scroll inside `.cm-scroller` instead of pushing past the `StatusBar`. Root cause was a missing `min-h-0` on the InputPanel wrapper inside its flex column.
- **About page overlap**: long content no longer overflows onto the Footer. About is now wrapped in `flex-1 min-h-0 overflow-y-auto`, scrolling within `<main>`.

### Dependencies

- Added `@codemirror/lang-yaml` and `@codemirror/lang-xml` (both MIT). Both fold into the existing `codemirror` manualChunk.

### Tests

- **8 new unit tests**: 6 for `workspaceStore` (setters, persistence, format-switch options retention), 2 for `batchStore` dedup behavior. Total tests: **183**.

## [1.2.0] — 2026-05-13

### Added — Đợt sửa lỗi 3: Tauri fixes, workflow hygiene, JP/ZH-CN, reverse UX, docs

- **Tauri 2 single-instance** via `tauri-plugin-single-instance`. Launching the app while it's already open now focuses the existing window instead of spawning a new process.
- **Japanese (`ja`) and Simplified Chinese (`zh-CN`)** locales — AI-translated, surfaced under the existing `disclaimer.translation` i18n key.
- **Reverse batch processing** — drag-drop multiple non-JSON files in reverse mode, get a `.zip` of `.json` outputs back. `batch-processor` gained a `direction` parameter that routes through `converter.reverse()` instead of `parseJsonInput`.
- **Reverse UX**: InputPanel + BatchPanel accept list, file picker, and editor label all switch dynamically when direction = reverse. The label reads e.g. "Input YAML" / "Input CSV".
- **Auto-discussion workflow** (`.github/workflows/announce-discussion.yml`): publishes a Discussion post when a release is created or a GH Pages deploy succeeds. Uses GraphQL `createDiscussion` mutation; requires Discussions + an `Announcements` category enabled in repo settings (one-time setup).
- **Docs suite** (root, GitHub auto-detects): `PRIVACY.md`, `SECURITY.md`, `DISCLAIMER.md`, `MAINTAINERS.md`, `THIRD-PARTY.md` (canonical categorized dep list), `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1).
- **Docs operational**: `docs/pc_spec.md` + `docs/dev_env.md` + Vietnamese mirrors under `docs/i18n/vi/`.
- **About page expansion**: Donate grid (5 channels from `.github/FUNDING.yml`), categorized third-party summary, build info (version + commit SHA + date — injected via Vite `define` from `git rev-parse`), Links section, Disclaimer footer.
- **CONTRIBUTING update**: "Auto-ignored cases" rules for suspicious code, off-topic preamble, missing PR descriptions.
- **Community files**: `.github/dependabot.yml` (weekly npm + actions + cargo, grouped), `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/config.yml`.

### Fixed

- **Tauri build black screen.** React Router basename was driven by `import.meta.env.PROD`, which is true in both web and Tauri prod builds — basename became `/jsonprism` in Tauri bundles (which serve from `/`), so no routes matched and the page rendered blank. Introduced build-time `__IS_TAURI_BUILD__` Vite define keyed off `TAURI_ENV_PLATFORM`.
- **Workflow skip noise**: `notify-ci-failure.yml` and `notify-release-pipeline.yml` dropped `workflows: ["*"]` catch-all in favor of explicit workflow names; massively fewer "skipped" runs in the Actions tab.

### Changed

- **GitHub Actions bumped**: `actions/checkout` v4 → v6, `actions/setup-node` v4 → v6 (Node 24 LTS-ready).

## [1.1.0] — 2026-05-13

### Added — Đợt sửa lỗi 2: hygiene, dep upgrades, Tauri process, binary formats, reverse

- **BSON / CBOR / MessagePack converters** — 3 new binary target formats. Output is rendered as base64 (default) or hex via per-format `encoding` option; downloads decode back to raw bytes for proper binary files (`.bson`, `.cbor`, `.msgpack`). New `ConverterMeta.binary` flag.
- **Reverse conversion** — `Converter<T>.reverse(input, options)` optional interface method. Five reverse implementations: `JSONL`, `CSV/TSV`, `YAML`, `TOML`, `RESX` → JSON. UI: new `DirectionToggle` component persisted to localStorage; `FormatPicker` disables formats without `reverse()`; `OutputPanel` swaps extension to `.json` in reverse mode.
- **Tauri process hygiene**: explicit `RunEvent::ExitRequested` + `WindowEvent::CloseRequested` cleanup in `src-tauri/src/lib.rs`. Calls `cleanup_before_exit()` so any spawned shell children are signaled before shutdown. New `docs/TAURI-NOTES.md` documents the upstream WebView2 GDI leak.

### Fixed

- **8 TypeScript strict errors** (override modifier, exactOptional, Blob `Uint8Array<ArrayBuffer>`).
- **`npm run typecheck`** script switched from `tsc --noEmit` (no-op with the root tsconfig) to `tsc -b --noEmit`. CI now actually catches type errors.
- **Theme toggle** rewritten: replaced racy `onBlur` timeout with `pointerdown` click-outside detection + Escape key + ARIA `role="menu"`.
- **10 pre-existing test failures** (jsdom localStorage shim, outdated registry/CSV assertions, batch-processor mock for not-ready branch).

### Changed

- **Dependency upgrades**: `jsdom` ^25 → ^29, `vite` ^6 → ^8 (Rolldown bundler — ~5× faster builds), `@vitejs/plugin-react` ^4 → ^6, `engines.node` >=22.0 → >=22.11. `vite.config.ts` `manualChunks` converted to function form (Rolldown requires it).
- **Vite minifier**: `esbuild` → `oxc` (Rolldown-native, no separate install).

### Tests

- 175 tests pass (was 137). New coverage for the 3 binary converters (17 tests) and 5 reverse converters (11 tests).

## [1.0.0] — 2026-05-12

### Added — Phase 3: RESX + i18n migration

- **RESX converter** (`.resx`) — hand-rolled XML output byte-aligned with Visual Studio's editor. 9/9 formats now production-ready.
  - Accepts flat string-to-string objects: `{ "Key": "value", ... }`
  - Supports the `{ value, _comment }` shape per entry; emits both `<value>` and `<comment>` elements
  - Options: `commentKey` (default `_comment`), `includeSchema`, `sortKeys`
  - Full RESX 2.0 schema header + `resmimetype` / `version` / `reader` / `writer` resheaders
  - Proper XML escaping: `&`, `<`, `>` in text; quotes in `name=` attributes
  - Rejects nested objects (the only valid use of nesting is the `{ value, _comment }` shape)
- **Smart format suggestions** — picker now highlights formats matching the detected JSON shape with a subtle ring:
  - `flat-object` → RESX surfaces first
  - `array-of-objects` → CSV/TSV/Markdown/SQL/JSONL
  - `object` → YAML/TOML/XML
  - `array` → JSONL/YAML/XML
  - `scalar` → YAML
- **Migration tutorial** (`docs/RESX-MIGRATION.md`) — step-by-step guide for taking i18next JSON locales into .NET RESX, with batch flow, Visual Studio verification, comment support, and a worked example using PhantomMAC's 30+ locale files

### Status

**JSONPrism reaches 1.0.** All 9 formats production-ready; web + desktop; bilingual; 110+ tests.

### Tests

- **15+ new tests**: RESX converter (escaping, comment shape, sort order, error paths, Visual Studio byte-match), suggestions module
- Total tests: **115+**

## [0.5.0] — 2026-05-12

### Added — Phase 2C: Tauri 2 desktop wrapper

- **`src-tauri/` Rust workspace** with Tauri 2.x: `Cargo.toml`, `tauri.conf.json`, `src/lib.rs`, `src/main.rs`, `build.rs`
- **App identifier**: `com.kokone.jsonprism`
- **Bundle targets**: Windows (MSI via WiX + NSIS installer), macOS (DMG, min 12.0), Linux (AppImage + deb)
- **Window config**: 1280×820 default, 800×560 minimum, drag-drop enabled, theme follows system
- **CSP locked down** to: self + Google Fonts (existing fonts) + IPC channel only
- **Tauri 2 plugin integration**: `plugin-dialog`, `plugin-fs`, `plugin-os`, `plugin-shell`
- **Capability file** (`capabilities/default.json`) scoped to `$HOME`, `$DOCUMENT`, `$DOWNLOAD`, `$DESKTOP`
- **Custom Rust command `host_info`** exposes OS / arch / app version for diagnostics
- **Frontend Tauri bridge** (`src/lib/tauri.ts`): `isTauri()`, `nativeOpenFiles()`, `nativeSaveBlob()`, `nativeReadText()`, `fileFromNativePath()`, `tauriHostInfo()`
- **Native drag-drop hook** (`useTauriDragDrop`) listens to `tauri://drag-drop` events and feeds File objects into the existing batch store
- **InputPanel + BatchPanel** branch on `isTauri()`: native dialogs in Tauri, web inputs in browser
- **Single source of truth**: same React UI, same converters, same tests — only I/O boundaries branch
- **Vite config Tauri-aware**: detects `TAURI_ENV_PLATFORM`, switches base to `/`, skips clearing screen, respects `TAURI_DEV_HOST` for mobile dev
- **Icon source** (`src-tauri/icons/icon.svg`, 1024×1024) — generates all platform icons via `npm run tauri:icon`
- **GitHub Actions release workflow** (`.github/workflows/release.yml`): matrix-builds Windows, macOS (Apple Silicon + Intel), Linux on `v*` tag push; creates draft GitHub release

### Dependencies

- Added `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-os`, `@tauri-apps/plugin-shell` (^2.0.0 each)
- Added `@tauri-apps/cli` (devDep)

### New npm scripts

- `tauri:dev` — runs Tauri window in dev mode with HMR
- `tauri:build` — produces the platform's native bundle
- `tauri:icon` — generates all platform icons from `src-tauri/icons/icon.svg`

## [0.4.0] — 2026-05-12

### Added — Phase 2B: Batch processing

- **Multi-file queue** — drop up to **500 JSON files** at once for parallel conversion to any ready format
- **Batch panel** (Sheet drawer) — per-file status (queued / processing / done / error), inline drop zone, per-row remove
- **Cooperative scheduling** — yields to the UI between files via `requestIdleCallback` with `setTimeout(0)` fallback, so the browser stays responsive on large queues
- **Per-file error isolation** — broken JSON or converter errors don't stop the rest of the batch; each failure is surfaced inline
- **AbortController-based cancellation** — Cancel button stops the run mid-batch
- **`.zip` export** via **fflate** (~8KB gzipped, much smaller than JSZip), with automatic filename collision handling (`data.csv`, `data_2.csv`, …)
- **Smart drop routing in input panel** — single file goes into the editor, 2+ files auto-open the batch panel and queue them
- **Zustand `batchStore`** — `Record<string, BatchItem>` + `itemOrder` for O(1) per-item updates without re-rendering the whole list
- **Trigger pill in toolbar** shows current queue size

### Tests

- **20+ new Vitest tests** covering `batchStore` mutations, `processBatch` cooperative scheduling and abort, `zipOutputs` round-trip (decode and verify contents), filename uniquification
- Total tests: **100+**

### Dependencies

- Added `fflate ^0.8.2` (zip)

## [0.3.0] — 2026-05-12

### Added — Phase 2A: four new converters

- **XML converter** via fast-xml-parser. Options: `indent`, `rootName`, `itemName`, `declaration`. Supports attributes via the `@_` key prefix convention.
- **TOML converter** via smol-toml. Option: `sortKeys` (recursive). Rejects non-object roots with a clear error.
- **Markdown table converter** (hand-rolled). Options: `alignment` (left/center/right/none), `escapePipes`. Newlines in cells become `<br>` per GFM.
- **SQL INSERT converter** (hand-rolled). Options: `tableName`, `dialect` (standard/postgres/mysql/sqlite/mssql), `multiRow`, `chunkSize`, `includeCreate`. Per-dialect identifier quoting, value escaping, and `CREATE TABLE` type inference.

### Tests

- **45+ new Vitest tests** across XML, TOML, Markdown, and SQL converters (helpers tested in isolation: `quoteIdentifier`, `formatSqlValue`, `inferSqlType`)
- Round-trip tests for XML (via `XMLParser`) and TOML (via `parse`)
- Per-dialect SQL coverage (5 dialects × value types)
- Total Vitest tests: **80+**

### Changed

- All 8 user-visible converters now report `ready: true`. RESX remains Phase 3.
- `xml.ts`, `toml.ts`, `markdown.ts`, `sql.ts` are no longer stubs.

## [0.2.0] — 2026-05-12

### Added — Phase 1 polish

- **CodeMirror 6** input editor with JSON syntax highlighting and parse-error linting
- **Settings panel** (Sheet drawer) auto-generated from each converter's `optionSchema`
- **Per-format options exposed** in the UI:
  - JSONL: `pretty` toggle
  - CSV/TSV: `header` toggle, `newline` (LF/CRLF), `nestedStrategy` (json/flatten)
  - YAML: `indent` (2–8), `quoteStyle` (auto/single/double)
- **Settings persist** to `localStorage` per format; survive reload and tabs
- **File handling**: drag-drop + "Open" button for single `.json` / `.txt` files
- **Sonner toasts** for copy success, download, file load, options reset, errors
- **Keyboard shortcuts**: `Cmd/Ctrl+K` clear input, `Cmd/Ctrl+S` download output
- **Status bar** showing input/output byte counts, parse time, and shortcut hints
- **Shape detection hint** above the format picker (scalar / object / array / flat-object / array-of-objects)
- **Format selection persists** to localStorage
- **Tests**: 35+ Vitest tests covering all Phase 1 converters, registry, shape detection, options storage

### Changed

- `Converter<TOptions>` interface now requires `optionSchema: ReadonlyArray<OptionSchemaField<TOptions>>`
- YAML `indent` option changed from `2 | 4` literal to `number` (range 2–8 via integer schema)
- Stub converters (XML/TOML/Markdown/SQL/RESX) declare empty `optionSchema: []` to satisfy the interface
- `InputPanel` and `OutputPanel` updated to use `CodeEditor` and toast notifications

### Developer experience

- **Vitest** + `@testing-library/react` + `jsdom` configured
- `npm test`, `npm run test:watch`, `npm run test:coverage` scripts
- CI runs tests between typecheck and build

## [0.1.0] — 2026-05-12

### Added — Phase 0 scaffold

- Project scaffold with Vite 6 + React 19 + TypeScript 5.7 strict
- Tailwind CSS v4 setup using `@theme inline` syntax
- "Prism Spectrum" theme with violet / cyan / amber / rose accents
- Dark + light theme with system preference detection
- Bilingual interface (English + Vietnamese) via i18next
- React Router v7 with `/` and `/about` routes
- Converter framework: `Converter<TOptions>` interface, registry, shape detection
- **Phase 1 working converters**: JSONL, CSV, TSV, YAML
- **Phase 2 stubs with implementation plans**: XML, TOML, Markdown table, SQL INSERT
- **Phase 3 stub**: RESX (.NET resources)
- UI: header with brand mark, hero, format picker, side-by-side input/output panels
- Copy + download actions with proper MIME types
- shadcn/ui configuration (`components.json`)
- GitHub Actions CI workflow (format, lint, typecheck, build)
- GitHub Actions deploy workflow → GitHub Pages
- Apache License 2.0
- Full documentation: `README.md` (EN + VI), `CLAUDE.md`, `CONTRIBUTING.md`, `docs/ROADMAP.md`
