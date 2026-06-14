# JSONPrism Roadmap

This document is the **single source of truth** for what's done, what's next, and why.

Update it as work lands — keep the project status honest.

---

## Phase 0 — Scaffold ✅

**Status**: complete (2026-05-12)
**Duration**: ~1 day

Foundation: build tooling, app shell, converter framework, four working converters, full docs.

What landed:

- Vite 6 + React 19 + TypeScript 5.7 strict
- Tailwind v4 + shadcn-ready theme tokens
- Routing, theming, i18n (EN + VI), error boundary
- Converter interface + registry + shape detection
- Working: JSONL, CSV, TSV, YAML
- Stubs with detailed plans: XML, TOML, Markdown, SQL, RESX
- CI + GH Pages deploy workflows
- Full documentation suite

---

## Phase 1 — Polish & Foundations ✅

**Status**: complete (2026-05-12)
**Actual**: ~1 day

Goal: make the four working converters production-quality and the UX delightful enough to share publicly.

### Tasks

#### 1.1 Editor upgrade

- [x] Replace `<textarea>` input with **CodeMirror 6** + `@codemirror/lang-json`
- [x] Line numbers + active-line highlight
- [x] Folding for nested structures
- [x] Theme: custom Prism Spectrum tokens applied to lezer highlight tags
- [x] Parse-error linting (visible gutter markers)
- [ ] Output panel uses CodeMirror in read-only mode with format-specific syntax — *deferred to Phase 2 (needs per-format language packages: yaml, xml, sql)*

#### 1.2 Settings panel

- [x] Side sheet (Radix Dialog) that opens per-converter options
- [x] Form widgets auto-generated from `optionSchema`: Switch, segmented enum, number input, text input
- [x] Settings persist to localStorage per format
- [x] "Reset to defaults" button with toast confirmation

#### 1.3 Per-format options exposed in UI

- [x] JSONL: pretty toggle
- [x] CSV/TSV: header toggle, newline (LF/CRLF), nested strategy (json/flatten)
- [x] YAML: indent (2–8), quote style

#### 1.4 File handling

- [x] Drag-drop a single `.json` file onto the input panel
- [x] "Open file…" button via hidden file input
- [x] Drop overlay with Prism Spectrum styling
- [ ] Auto-detect file encoding — *non-issue; FileReader uses UTF-8 by default and modern editors don't emit BOM*

#### 1.5 Notifications

- [x] Sonner toast for: copy success/failure, download started, file loaded/failed, options reset
- [x] Dismissible, bottom-right, dark/light aware via ThemeProvider integration

#### 1.6 Testing

- [x] Vitest + @testing-library/react + jsdom configured
- [x] Unit tests for all Phase 1 converters (happy path + edge cases): 35+ tests
- [x] Tests for `parseJsonInput`, `detectShape`, `options-storage`
- [x] CI runs tests between typecheck and build

#### 1.7 Polish

- [x] Keyboard shortcuts: ⌘/Ctrl+K (clear), ⌘/Ctrl+S (download)
- [x] Status bar showing: input bytes, output bytes, parse time, shortcut hints
- [x] Shape detection hint (scalar / object / array / flat-object / array-of-objects)
- [x] Disabled-format chips show "P2"/"P3" badge with tooltip
- [ ] Cmd/Ctrl+, to open settings — *deferred; Sheet trigger handles its own keyboard nav via Radix*

### Deliverable

A polished, single-file converter UX with four production-grade converters. Ready to demo publicly and share in the Discord open-source server. **35+ unit tests passing**.

---

## Phase 2 — Four more formats + batch + Tauri

Split into three sub-phases for digestibility.

### Phase 2A — Four new converters ✅

**Status**: complete (2026-05-12)
**Actual**: ~1 day

#### XML converter

- [x] `fast-xml-parser` `XMLBuilder` integration
- [x] Configurable root element name, item name, declaration, indent
- [x] Attribute convention: keys starting with `@_` become attributes
- [x] Array handling: each item wrapped with `itemName` element when array is root
- [x] XML declaration prepended conditionally
- [x] 8 unit tests including round-trip via `XMLParser`

#### TOML converter

- [x] `smol-toml` `stringify` integration
- [x] Rejects non-object roots (array, scalar, null) with clear error
- [x] `sortKeys` option, recursive
- [x] Nested tables emitted naturally via smol-toml
- [x] 7 unit tests including round-trip via `parse`

#### Markdown table converter

- [x] Hand-rolled, zero deps
- [x] Header row from union of all object keys (preserve insertion order)
- [x] Alignment markers per column (left/center/right/none)
- [x] Pipe escaping in cell values
- [x] Newlines → `<br>` per GFM
- [x] Nested values JSON-stringified
- [x] 11 unit tests

#### SQL INSERT converter

- [x] Hand-rolled, zero deps
- [x] Dialect support: standard / postgres / mysql / sqlite / mssql
- [x] Identifier quoting per dialect (double-quote / backtick / bracket) with proper escaping
- [x] Value escaping per dialect (booleans differ across all 5)
- [x] Multi-row INSERT with configurable chunk size
- [x] Optional `CREATE TABLE` inference from first row's types
- [x] Missing keys across rows → `NULL`
- [x] 19 unit tests (helpers + integration; 5 dialects × value types)

### Phase 2B — Batch processing ✅

**Status**: complete (2026-05-12)
**Actual**: ~1 day

- [x] Drag-drop multiple files onto a dropzone (`react-dropzone`)
- [x] Batch queue panel showing: filename, size, status (queued/processing/done/error), output size
- [x] Hard limit: 500 files (`BATCH_MAX_FILES`)
- [x] Process in chunks to keep UI responsive (`requestIdleCallback` with `setTimeout(0)` fallback)
- [x] "Download all (.zip)" via **fflate** (chosen over JSZip for ~12× smaller bundle)
- [x] Per-file error display without blocking the rest of the queue
- [x] AbortController-based cancellation
- [x] Smart drop routing: 1 file → editor, 2+ files → batch panel auto-opens
- [x] Zustand store with item map + display order for O(1) per-item updates
- [x] Filename collision handling in the zip
- [x] 20+ unit tests including round-trip zip decode

### Phase 2C — Tauri 2 desktop wrapper ✅

**Status**: complete (2026-05-12)
**Actual**: ~1 day

- [x] `src-tauri/` scaffold with Tauri 2.x (`Cargo.toml`, `tauri.conf.json`, `lib.rs`)
- [x] Tauri serves Vite-built `dist/`; dev mode runs Vite + Tauri window with HMR
- [x] Native file open/save dialogs via `plugin-dialog` + `plugin-fs`
- [x] OS drag-drop integration via `tauri://drag-drop` events (hook: `useTauriDragDrop`)
- [x] App icons: SVG source committed (`src-tauri/icons/icon.svg`), generated formats via `npm run tauri:icon`
- [x] Bundle targets: Windows (MSI + NSIS `.exe`), macOS (DMG + .app, min 12.0), Linux (AppImage + deb)
- [x] CSP and capability file locked down (scoped to user dirs only)
- [x] Custom Rust command `host_info` for diagnostics
- [x] GitHub Actions release workflow (matrix: Windows / macOS ARM / macOS Intel / Linux); draft release on `v*` tag
- [x] Vite config detects Tauri context and adjusts base path + dev server
- [x] Frontend `isTauri()` runtime gate keeps web bundle free of Tauri imports (tree-shaken)
- [x] `Velopack` skipped — using Tauri's native bundler (avoids the two-tool overhead PhantomMAC has)

### Deliverable (full Phase 2)

8/9 formats production-ready. Batch up to 500 files. Desktop builds for Windows / macOS / Linux. JSONPrism becomes a "real" tool, not just a website.

**Currently at Phase 2A — only RESX (Phase 3) remains as a stub.**

---

## Phase 3 — RESX & i18n integration ✅

**Status**: complete (2026-05-12)
**Actual**: ~1 day

Goal: ship the .NET RESX converter and integrate with existing AutoClickForge / PhantomMAC localization workflows.

### Tasks

#### 3.1 RESX converter

- [x] Hand-rolled XML output (skip fast-xml-parser; the template is too rigid)
- [x] Standard RESX 2.0 header with `xsd:schema` + 4 `resheader` elements (resmimetype, version, reader, writer)
- [x] Input contract: flat object `{ "Key": "value" }`; nested objects → reject with helpful error
- [x] Optional `_comment` key (configurable via `commentKey` option) → emits `<comment>` element on the `<data>`
- [x] XML escaping for text content (&, <, >) and attribute context (quotes)
- [x] Number and boolean coercion to string
- [x] Null/undefined coerced to empty string
- [x] `sortKeys` option for stable diffs across locale files
- [x] `includeSchema` option (Visual Studio expects schema; tests verify byte-exact match)
- [x] 17 unit tests covering schema, comment shape, escaping, sort order, error paths

#### 3.2 Smart UI for the RESX use case

- [x] Format picker highlights suggested formats based on `detectShape` output via subtle ring
- [x] Flat-object detection surfaces RESX first in the suggestion list
- [x] Batch processor preserves locale segment in filenames: `strings.vi.json` → `strings.vi.resx`

#### 3.3 Documentation

- [x] `docs/RESX-MIGRATION.md` — tutorial: i18next JSON → .NET RESX, with flatten script, batch flow, Visual Studio verification, comment support, CI sketch
- [x] Cross-link with PhantomMAC / AutoClickForge i18n docs in the worked example

### Deliverable

**9/9 formats production-ready.** RESX integration documented as a real migration path between i18next-based web projects and .NET WPF projects. JSONPrism reaches **1.0**.

---

## Phase 4 — Binary formats & reverse conversion ✅

**Status**: complete (shipped in v1.1.0)

Post-1.0 expansion: three binary target formats and bidirectional conversion.

- [x] **BSON / CBOR / MessagePack** converters — output rendered as base64 (default) or hex; downloads decode back to raw bytes. New `ConverterMeta.binary` flag.
- [x] **Reverse conversion** — optional `Converter<T>.reverse()` interface method; JSONL, CSV/TSV, YAML, TOML, RESX → JSON. New `DirectionToggle` component, direction persisted to localStorage.
- [x] Reverse batch processing — drop non-JSON files, get a `.zip` of `.json` outputs back.

**12/12 formats production-ready.**

---

## Phase 5 — Maintenance & refactor ✅

**Status**: complete (shipped in v1.5.0)

Codebase hygiene plus a small UX addition — no converter behavior changed.

- [x] Decomposed three oversized components (`BatchPanel`, `ConverterWorkspace`, `InputPanel`) into focused pure utilities, leaf components, and hooks — behavior-preserving, all 193 tests still green.
- [x] Integrated `knip` for dead-code analysis: `knip.json` config, `npm run knip` script, and a CI step. Initial sweep removed orphaned code and a phantom dependency.
- [x] Scroll-to-top button on the long, scrollbar-hidden About page (respects `prefers-reduced-motion`).

---

## Phase 6 — Legal gates, error pages & load performance ✅

**Status**: complete (shipped in v1.6.0)

Compliance + reliability + first-paint performance. No converter behavior changed.

- [x] Custom error pages: reusable `ErrorState`, 404 catch-all, generic `/error/:code` (403/419/5xx variants), offline banner, and a chunk-load error boundary folded into the existing crash boundary's look.
- [x] GitHub Pages SPA deep-link fix (`public/404.html` + `index.html` decoder for the `/jsonPrism/` base).
- [x] First-launch legal consent gate (web only) — accept License/Terms/Privacy/Disclaimer, persisted to `localStorage` with a version for re-prompting; skipped on desktop.
- [x] Windows installer license-acceptance page via Tauri `bundle.licenseFile` (`src-tauri/license.rtf`), covering both NSIS `.exe` and WiX `.msi`.
- [x] Lazy-load routes + the CodeMirror editor; refined `manualChunks` (react/router/i18n/cm-core/cm-langs/per-parser/ui); removed the `bson` initial-graph leak via `lib/bytes.ts`. +16 tests (209 total).

---

## Beyond — Ideas (no commitment)

- **JSON → Excel (.xlsx)** via SheetJS — possible if Markdown/CSV doesn't cover the use case
- **Reverse direction** (other format → JSON): different mental model; might warrant a sibling app
- **Schema inference**: emit JSON Schema, TypeScript types, or Go structs from sample JSON
- **CLI version**: same converter modules, exposed as a Node CLI for CI pipelines
- **VS Code extension**: surface the converters in the editor command palette
- **Sharing**: hash-based shareable URLs (`#data=...`) for sample inputs (privacy: opt-in only)

These are deliberately deferred — Phase 1–5 first.

---

## Tracking

Update this file when:

- A task is completed (mark it `- [x]` and add a date if significant)
- An estimate changes meaningfully
- The phase plan changes (and explain why in the commit message)
- A new phase is added to the "Beyond" section

The goal: anyone reading this should be able to answer **"What's the current state of JSONPrism?"** in 30 seconds.
