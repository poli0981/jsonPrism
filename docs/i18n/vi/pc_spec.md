# Cấu hình máy của developer

Cấu hình phần cứng mà maintainer sử dụng để build và test JSONPrism.
Tài liệu hoá để contributor biết những gì đã được kiểm chứng — **không**
phải là yêu cầu hệ thống để chạy JSONPrism (bản web chạy trên mọi trình
duyệt hiện đại; bản Tauri chạy trên Windows / macOS / Linux trong phạm
vi hỗ trợ chung của Tauri).

## Máy chính

| Thành phần | Chi tiết |
|---|---|
| **OS** | Windows 11 Pro 25H2 Insider Preview (Dev Channel) |
| **Build** | 26300.8376 |
| **CPU** | Intel Core i7-14700KF |
| **GPU** | NVIDIA GeForce RTX 5080 (16 GB VRAM) |
| **RAM** | 32 GB DDR5 |
| **Lưu trữ** | 1 TB SSD |
| **IDE** | JetBrains IDEs (bản trả phí, 2026.x) + Visual Studio Code |

## Thiết bị di động / kiểm tra web

Dùng để kiểm tra bản web (chủ yếu là deploy lên GitHub Pages) trên thiết bị cảm ứng:

- iPhone 14 Pro — iOS 26.x — Chrome, Brave
- iPhone 13 Pro Max — iOS 26.x — Chrome, Brave

Android: app được build và smoke-test trên emulator (API 31 cho cổng chặn
cài / min-SDK, API 36 với WebView Chromium 134 cho phần render) — chưa có
thiết bị thật chuyên dụng. **Yêu cầu hệ thống cho người dùng cuối** (Android
12+, WebView Chromium 111+, RAM, dung lượng) nằm ở mục "Yêu cầu hệ thống"
trong README; chi tiết build / ký nằm ở
[docs/TAURI-NOTES.md](../../TAURI-NOTES.md).

## Tài liệu liên quan

- [docs/dev_env.md (VI)](dev_env.md) — toolchain + workflow phát triển.
- [docs/TAURI-NOTES.md](../../TAURI-NOTES.md) — ghi chú riêng cho Tauri.
- [English](../../pc_spec.md)
