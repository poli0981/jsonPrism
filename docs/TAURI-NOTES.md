# Tauri runtime notes

Operational notes for the desktop builds. Aimed at maintainers, not end users.

## Process lifecycle

`src-tauri/src/lib.rs` wires two cleanup hooks that should keep the host
process from outliving the main webview:

- `on_window_event` — when the main window receives `CloseRequested`, the
  app handle's `exit(0)` is called explicitly. This guards against Windows
  builds occasionally leaving `JSONPrism.exe` alive when the webview was
  the last live reference.
- `RunEvent::ExitRequested` — calls `app_handle.cleanup_before_exit()` so
  any spawned shell children (none today, but the hook is in place) are
  signaled before the process exits.

If you ever add long-running spawned commands (e.g. via `tauri_plugin_shell`),
remember to track their handles and kill them in the same hook.

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

See `src-tauri/capabilities/default.json`. Scope is intentionally narrow:

- Filesystem reads/writes only inside `$HOME`, `$DOCUMENT`, `$DOWNLOAD`,
  `$DESKTOP`.
- Dialog plugin for open/save.
- Shell plugin restricted to `shell:allow-open` (URL opening only — no
  arbitrary command spawn).

Widening the scope requires both a capability edit and a CSP review in
`tauri.conf.json`.

## Bundle targets

- Windows: MSI (via WiX) + NSIS `.exe`. Tested on Windows 10 22H2 and
  Windows 11.
- macOS: DMG + `.app`, min version 12.0 (Monterey).
- Linux: AppImage + Debian package.

The release matrix in `.github/workflows/release.yml` builds all four
combinations (Linux, macOS Intel, macOS Apple Silicon, Windows) on a `v*`
tag push.
