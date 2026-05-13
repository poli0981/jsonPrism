# Changelog

All notable changes to JSONPrism are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Project is feature-complete for the original Phase 0–3 plan. Future work tracked in `docs/ROADMAP.md` under "Beyond Phase 3".

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
