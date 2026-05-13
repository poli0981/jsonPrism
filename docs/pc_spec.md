# Developer hardware

Reference hardware used by the maintainer to build and test JSONPrism.
This is documented so contributors know what's been exercised — it is
**not** a system requirement for running JSONPrism (the web build runs
in any modern browser; the Tauri build runs on Windows / macOS / Linux
within Tauri's general support matrix).

## Primary workstation

| Component | Detail |
|---|---|
| **OS** | Windows 11 Pro 25H2 Insider Preview (Dev Channel) |
| **Build** | 26300.8376 |
| **CPU** | Intel Core i7-14700KF |
| **GPU** | NVIDIA GeForce RTX 5080 (16 GB VRAM) |
| **RAM** | 32 GB DDR5 |
| **Storage** | 1 TB SSD |
| **IDE** | JetBrains IDEs (paid, 2026.x) + Visual Studio Code |

## Mobile / web-test devices

Used to verify the web build (mainly the GitHub Pages deploy) on touch
form factors:

- iPhone 14 Pro — iOS 26.x — Chrome, Brave
- iPhone 13 Pro Max — iOS 26.x — Chrome, Brave

Android testing is opportunistic (no dedicated device); the web build
should still work given mainstream WebView versions.

## Related docs

- [docs/dev_env.md](dev_env.md) — toolchain + dev workflow.
- [docs/TAURI-NOTES.md](TAURI-NOTES.md) — Tauri-specific build notes.
- [Tiếng Việt](i18n/vi/pc_spec.md)
