<div align="center">

# JSONPrism

**Tán sắc JSON ra nhiều định dạng.**

Một JSON đầu vào. Đa định dạng đích. Chạy hoàn toàn trên thiết bị của bạn.

[![CI](https://github.com/poli0981/jsonPrism/actions/workflows/ci.yml/badge.svg)](https://github.com/poli0981/jsonPrism/actions/workflows/ci.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=poli0981_jsonPrism&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=poli0981_jsonPrism)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

[Ứng dụng web](https://jsonprism.poli0981.dev) · [Tải về](https://github.com/poli0981/jsonPrism/releases/latest) · [English](README.md) · [Lộ trình](docs/ROADMAP.md)

</div>

---

JSONPrism là công cụ "tán sắc" cho developer. Nhận một JSON đầu vào và phân tách ra nhiều định dạng đích — như ánh sáng trắng đi qua lăng kính. **Việc chuyển đổi diễn ra hoàn toàn trên thiết bị của bạn** — trong trình duyệt, app desktop hay app Android — nên dữ liệu không bao giờ rời khỏi máy.

## Định dạng hỗ trợ

| Định dạng         | Phần mở rộng | Trạng thái     | Đảo (→ JSON) |
| ----------------- | ------------ | -------------- | ------------ |
| JSONL             | `.jsonl`     | ✅ Phase 1      | ✅            |
| CSV               | `.csv`       | ✅ Phase 1      | ✅            |
| TSV               | `.tsv`       | ✅ Phase 1      | ✅            |
| YAML              | `.yaml`      | ✅ Phase 1      | ✅            |
| XML               | `.xml`       | ✅ Phase 2      | —            |
| TOML              | `.toml`      | ✅ Phase 2      | ✅            |
| Bảng Markdown     | `.md`        | ✅ Phase 2      | —            |
| SQL `INSERT`      | `.sql`       | ✅ Phase 2      | —            |
| RESX (.NET)       | `.resx`      | ✅ Phase 3      | ✅            |
| BSON              | `.bson`      | ✅ Phase 4      | —            |
| CBOR              | `.cbor`      | ✅ Phase 4      | —            |
| MessagePack       | `.msgpack`   | ✅ Phase 4      | —            |

Tổng cộng 12 định dạng. Sáu trong số đó — JSONL, CSV, TSV, YAML, TOML và RESX — còn chuyển ngược được về JSON; ở chiều này app cũng nhận file `.ndjson`, `.tab` và `.yml`. SQL `INSERT` hỗ trợ SQL chuẩn, PostgreSQL, MySQL, SQLite và MSSQL. BSON, CBOR và MessagePack là định dạng nhị phân: panel output hiển thị chúng dưới dạng text base64 hoặc hex, còn file tải về là binary thật.

## Tính năng

- **Chuyển đổi ngay trên thiết bị** — không upload, không có server chuyển đổi. Những gì bạn dán, gõ hay mở đều ở lại trên máy; xem phần [Quyền riêng tư](#quyền-riêng-tư) để biết vài dịch vụ mà riêng website sử dụng.
- **Khởi động nhanh** — route và editor CodeMirror được lazy-load, mã vendor/parser tách thành nhiều chunk nhỏ theo tính năng, nên trình duyệt chỉ tải đúng phần bạn dùng.
- **Mượt cả với input lớn** — input trên 256 KB và mọi lượt xử lý batch đều chạy trong Web Worker, nên gõ phím và cuộn trang vẫn mượt.
- **Xử lý batch** — tới 500 file cùng lúc, tải về gọn trong một file `.zip` (định dạng nhị phân là binary thật).
- **Phát hiện shape thông minh** — nhận diện flat object, mảng object, scalar; gợi ý format đích phù hợp.
- **Tuỳ chọn theo từng format** — pretty-print, indentation, dialect (SQL), alignment (Markdown), v.v.
- **Theme sáng, tối hoặc theo hệ thống** — bảng màu Prism Spectrum với violet / cyan / amber / rose trên phong cách "kỹ thuật" với nền lưới kiểu bản vẽ (blueprint). Menu Giao diện còn có tuỳ chọn ẩn thanh cuộn.
- **Responsive — tối ưu cho viewport ≥ 360 × 640.** Màn hình nhỏ hơn vẫn dùng được nhưng có thể chật; trên mobile, Input và Output dùng Tabs UI để mỗi panel có toàn bộ chiều cao. Xem [`docs/tested-viewports.md`](docs/tested-viewports.md) cho ma trận thiết bị đã kiểm thử.
- **4 ngôn ngữ giao diện** — English, Tiếng Việt, 日本語 và 简体中文. Bản tiếng Nhật và tiếng Trung do AI dịch; rất hoan nghênh người bản ngữ góp ý chỉnh sửa.
- **App desktop và Android** — bản Tauri 2 cho Windows, macOS, Linux và Android, có dialog chọn file native và drag-and-drop. Chạy hoàn toàn offline.

## Quyền riêng tư

- **Dữ liệu của bạn ở lại trên thiết bị.** Mọi bản build đều chuyển đổi ngay trên máy; những gì bạn dán, gõ hay mở không bao giờ bị tải lên. Cài đặt và trạng thái workspace được lưu trong `localStorage` và không gửi đi đâu cả.
- **Riêng website** ([jsonprism.poli0981.dev](https://jsonprism.poli0981.dev)) **dùng thêm ba dịch vụ của Cloudflare**, và không dịch vụ nào thấy nội dung bạn chuyển đổi:
  - **Hosting** — Cloudflare phục vụ trang web và, như mọi nhà cung cấp hosting, xử lý log request (địa chỉ IP, user agent) để phân phối nội dung và bảo mật.
  - **Turnstile** — bước xác minh nhanh, khoảng mỗi tuần một lần (xác minh thành công được ghi nhớ 7 ngày). Nếu không kết nối được tới Cloudflare, bạn vẫn có thể tiếp tục sau một cảnh báo, vì việc chuyển đổi không bao giờ cần mạng.
  - **Web Analytics** — đếm lượt xem trang ẩn danh, không dùng cookie, chỉ được tải sau khi bạn chấp nhận Điều khoản và Chính sách quyền riêng tư. Tắt tại **Giao diện → Thống kê truy cập ẩn danh**; mặc định tắt nếu trình duyệt gửi tín hiệu Global Privacy Control.
- **App desktop và Android không dùng dịch vụ nào trong số này** — không analytics, không bước xác minh, không request mạng nào ngoài các link bạn tự mở.

Chi tiết: [`PRIVACY.md`](PRIVACY.md).

## Tech stack

- **Vite 8** + **React 19.3** + **TypeScript 7** (compiler native; dependency `typescript` là alias TS 6, chỉ giữ lại cho typescript-eslint)
- **Tailwind CSS v4** + **shadcn/ui** (style New York, base neutral)
- **CodeMirror 6** cho editor đầu vào và khung output chỉ đọc
- **PapaParse**, **js-yaml**, **smol-toml**, **fast-xml-parser**, **bson**, **cbor-x**, **@msgpack/msgpack** để parse/serialize; **fflate** để đóng gói file `.zip` khi xử lý batch
- **i18next** cho dịch thuật, **Zustand** cho state, **React Router 8** cho routing, **Sonner** cho toast
- **Vitest** + Testing Library cho test
- **Node.js 26** cho toolchain
- **Cloudflare Workers** host bản web (static assets kèm một Worker nhỏ cho `/api/*`)
- **Tauri 2.12** cho app desktop (Windows, macOS, Linux) và Android

## Bắt đầu nhanh

**Yêu cầu**: Node.js **26** (ghim trong `.nvmrc`).

```bash
git clone https://github.com/poli0981/jsonPrism.git
cd jsonPrism
nvm use              # chọn Node 26 theo .nvmrc
npm install
npm run dev          # http://localhost:5173
```

Bước xác minh Turnstile tắt khi chạy `npm run dev` (đặt `VITE_TURNSTILE_DEV=1` nếu muốn thử). Để chạy bản build production giống cách Cloudflare phục vụ — static assets kèm Worker:

```bash
cp .dev.vars.example .dev.vars   # secret test của Cloudflare Turnstile, luôn pass
npm run preview:cf               # build + wrangler dev tại http://localhost:8787
```

### Các script

| Script | Chức năng |
| --- | --- |
| `npm run dev` | Chạy Vite dev server với HMR |
| `npm run build` | Type-check rồi build production vào `dist/` |
| `npm run preview` | Xem trước bản build trên máy local (Vite) |
| `npm run lint` | Chạy ESLint |
| `npm run lint:fix` | Chạy ESLint với autofix |
| `npm run typecheck` | Type-check app, test, file config và Worker (TypeScript 7), không emit |
| `npm run knip` | Tìm file, export và dependency không dùng đến |
| `npm run format` | Format bằng Prettier |
| `npm run format:check` | Kiểm tra format (CI dùng cái này) |
| `npm test` | Chạy bộ test Vitest một lần |
| `npm run test:watch` | Chạy Vitest ở chế độ watch |
| `npm run test:coverage` | Chạy test kèm báo cáo coverage (CI dùng cái này) |
| `npm run cf:types` | Tạo lại type cho các binding của Worker |
| `npm run cf:check` | Chạy thử deploy lên Cloudflare (`wrangler deploy --dry-run`; CI cũng chạy) |
| `npm run preview:cf` | Build mới rồi chạy site + Worker bằng `wrangler dev` tại http://localhost:8787 |
| `npm run tauri:dev` | Chạy app desktop ở dev mode (Vite + cửa sổ Tauri có hot reload) |
| `npm run tauri:build` | Build bundle desktop native cho OS đang dùng |
| `npm run tauri:icon` | Render `src-tauri/icons/icon.svg` ra mọi kích thước icon |
| `npm run tauri:android:dev` | Chạy app Android trên thiết bị hoặc emulator |
| `npm run tauri:android:build` | Build APK Android universal |

### Components shadcn/ui

`components.json` đã được cấu hình sẵn. Thêm component theo nhu cầu:

```bash
npx shadcn@latest add button input textarea tabs select card dialog sheet \
  dropdown-menu switch badge progress tooltip sonner resizable
```

## Bản desktop (Tauri 2)

JSONPrism cũng có bản desktop native qua Tauri 2. App dùng cùng React UI, với dialog OS native và drag-drop tích hợp vào batch flow hiện có. App chạy hoàn toàn offline: không analytics, không bước xác minh, không request mạng nào ngoài các link bạn tự mở.

### Tải về (người dùng)

Tải bundle cho hệ điều hành của bạn từ [bản release mới nhất](https://github.com/poli0981/jsonPrism/releases/latest):

| Hệ điều hành | File | Yêu cầu |
| --- | --- | --- |
| **Windows** | `.msi` hoặc NSIS `-setup.exe` | WebView2 runtime (cài sẵn trên Windows 11) |
| **macOS** | `.dmg` universal (Apple Silicon + Intel) | macOS **12** trở lên |
| **Linux** | `.deb`, `.rpm` hoặc `.AppImage` | Build trên Ubuntu 22.04 — cần Ubuntu 22.04 hoặc distro mới tương đương |

Bản desktop chưa được ký số (code signing), nên Windows SmartScreen hoặc macOS Gatekeeper có thể cảnh báo ở lần mở đầu tiên. Từ v2.0.0, mỗi bản release đều kèm `SHA256SUMS.txt` và build-provenance attestation của GitHub để bạn kiểm tra file trước khi chạy:

```bash
sha256sum -c SHA256SUMS.txt --ignore-missing
gh attestation verify <file> --repo poli0981/jsonPrism
```

### Build (lập trình viên)

**Yêu cầu thêm**:

- **Rust toolchain** (`rustup`) với channel stable
- **Build deps theo platform**:
  - **Windows**: Visual Studio Build Tools (workload C++) + WebView2 (cài sẵn trên Windows 11)
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`, `libssl-dev`, `libgtk-3-dev`

**Generate icon một lần** (dùng Tauri CLI render SVG ra PNG/ICO/ICNS):

```bash
npm run tauri:icon
```

**Chạy dev mode** (Vite + Tauri window có hot reload):

```bash
npm run tauri:dev
```

**Build bundle native**:

```bash
npm run tauri:build
```

Output:

- Windows → `src-tauri/target/release/bundle/msi/*.msi` + `nsis/*-setup.exe`
- macOS → `src-tauri/target/release/bundle/dmg/*.dmg` + `macos/*.app`
- Linux → `src-tauri/target/release/bundle/appimage/*.AppImage` + `deb/*.deb` + `rpm/*.rpm`

**Release tự động**: push tag `v*` sẽ chạy `.github/workflows/release.yml`: kiểm tra tag khớp với version trong `package.json` và `src-tauri/Cargo.toml`, chạy test, build bundle Windows, macOS (universal), Linux cùng APK Android vào **một** draft GitHub release, rồi thêm `SHA256SUMS.txt` và build-provenance attestation. Maintainer sẽ publish draft đó.

## Bản Android (Tauri 2)

JSONPrism còn có bản Android để bạn sideload từ file `.apk`. Cùng React UI; chọn file qua dialog native. **Yêu cầu Android 12 (API 31) trở lên** — máy cũ hơn sẽ bị hệ điều hành chặn cài.

### Yêu cầu hệ thống

| Yêu cầu | Chi tiết |
| --- | --- |
| **Phiên bản Android** | **12 (API 31)** trở lên — máy cũ hơn bị chặn ngay khi cài (`INSTALL_FAILED_OLDER_SDK`) |
| **System WebView** | **Chromium 111+** (Android System WebView / Chrome). Đa số máy được Play Store cập nhật sẵn; WebView quá cũ sẽ render giao diện sai — nếu UI bị vỡ, hãy cập nhật "Android System WebView" và Chrome trong Play Store. |
| **CPU / ABI** | arm64-v8a, armeabi-v7a, x86 hoặc x86_64 — một file APK universal chạy được trên tất cả (máy hiện đại là arm64-v8a) |
| **RAM** | Tối thiểu 2 GB; khuyến nghị 4 GB cho file lớn hoặc xử lý hàng loạt (tối đa 500 file) |
| **Dung lượng** | Nên có ~100 MB trống (cài đặt + file tạm khi làm việc) |
| **Mạng** | Không cần — app chạy hoàn toàn offline, không gửi gì ra ngoài |

### Cài đặt (người dùng)

1. Tải `JSONPrism_<version>_android-universal.apk` từ [bản release mới nhất](https://github.com/poli0981/jsonPrism/releases/latest).
2. Nếu muốn, đối chiếu file với `SHA256SUMS.txt` hoặc kiểm tra bằng `gh attestation verify` (xem [Tải về (người dùng)](#tải-về-người-dùng)).
3. Mở file; Android sẽ hỏi cho phép "cài app không rõ nguồn" cho trình duyệt/trình quản lý file — bật lên rồi cài.
4. Cần Android 12+. App chạy hoàn toàn offline.

### Build (lập trình viên)

**Yêu cầu thêm** (ngoài Rust toolchain của bản desktop):

- **Android Studio** với SDK Platform **31+**, Build-Tools, Platform-Tools, Command-line Tools và một bản **NDK**
- **JDK** — dùng JBR đi kèm Android Studio là được
- Biến môi trường: `JAVA_HOME`, `ANDROID_HOME`, `NDK_HOME` (xem [`docs/TAURI-NOTES.md`](docs/TAURI-NOTES.md))
- Rust Android targets: `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android`

Project Gradle nằm ở `src-tauri/gen/android/` và đã được commit. Bạn **không** cần chạy `tauri android init` cho build thường.

**Chạy trên thiết bị/emulator** (Android 12+):

```bash
npm run tauri:android:dev
```

**Build APK release universal**:

```bash
npm run tauri:android:build
```

Output: `src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`. Thông tin ký lấy từ `src-tauri/gen/android/keystore.properties` (gitignored); thiếu file này thì APK build ra chưa ký. Xem [`docs/TAURI-NOTES.md`](docs/TAURI-NOTES.md) để biết cách tạo keystore và các secret ký trong CI.

**Release tự động**: cùng tag `v*` cũng chạy job `android` trong `release.yml`, ký APK bằng keystore từ repository secrets và đính vào draft release với tên `JSONPrism_<version>_android-universal.apk`.

## Kiến trúc

```
src/
├── app/                 # Router + providers
├── components/
│   ├── ui/              # shadcn components (thêm theo nhu cầu)
│   ├── layout/          # Header, Footer, AppearanceMenu
│   ├── converter/       # Workspace, panels, format picker, batch
│   └── common/          # ConsentGate, HumanCheck, error boundary, LanguageSwitcher
├── converters/          # Một module cho mỗi định dạng đích
│   ├── types.ts         # Interface Converter
│   ├── registry.ts      # Bảng tra cứu
│   └── *.ts             # Cài đặt theo từng format
├── hooks/               # Custom hooks
├── i18n/                # Dịch thuật (en, vi, ja, zh-CN)
├── lib/                 # detect, chuyển đổi + Web Worker, batch, theme, logger, utils
├── pages/               # Home, About, trang lỗi
├── stores/              # Zustand store (workspace, batch, consent, preferences)
├── styles/              # globals.css (Tailwind + theme tokens)
└── main.tsx
```

Ngoài `src/`: `worker/` là Cloudflare Worker (`/api/health` và `/api/turnstile/verify`, cấu hình trong `wrangler.jsonc`), còn `src-tauri/` là phần vỏ Tauri 2 cho app desktop và Android.

### Thêm định dạng mới

Mỗi format là một module độc lập, cài đặt interface `Converter`:

```ts
import type { Converter } from './types';
import { errorMessage } from '@/lib/errors';

interface MyFormatOptions {
  indent: number;
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
  // Drives the auto-generated settings panel.
  optionSchema: [
    { type: 'integer', key: 'indent', labelKey: 'options.myformat.indent', min: 0, max: 8 },
  ],
  convert({ data }, options) {
    try {
      const output = serialize(data, options);
      return { ok: true, output };
    } catch (err) {
      return { ok: false, error: errorMessage(err) };
    }
  },
  // Optional: reverse({ text }, options) parses the format back to JSON.
};
```

Sau đó thêm id vào union `FormatId` trong `src/converters/types.ts`, đăng ký converter trong `src/converters/registry.ts` (`CONVERTERS` và `ALL_FORMATS`), và thêm label key vào cả bốn file trong `src/i18n/locales/` — test parity sẽ fail nếu một ngôn ngữ thiếu key.

Xem [`docs/ROADMAP.md`](docs/ROADMAP.md) để biết kế hoạch phase đầy đủ.

## Đóng góp

Rất hoan nghênh pull request — vui lòng đọc [`CONTRIBUTING.md`](CONTRIBUTING.md) trước. PR thuộc nhóm **auto-ignored** (code đáng ngờ, lan man không vào vấn đề, không mô tả…) sẽ bị đóng không review.

Báo bug hoặc đề xuất tính năng tại [GitHub Issues](https://github.com/poli0981/jsonPrism/issues). Vấn đề bảo mật vui lòng dùng [Security Advisory riêng tư](https://github.com/poli0981/jsonPrism/security/advisories/new).

## Liên hệ

| Địa chỉ | Dùng cho |
| --- | --- |
| [security@poli0981.dev](mailto:security@poli0981.dev) | Báo lỗ hổng bảo mật (ưu tiên dùng [Security Advisory riêng tư](https://github.com/poli0981/jsonPrism/security/advisories/new)) |
| [privacy@poli0981.dev](mailto:privacy@poli0981.dev) | Yêu cầu liên quan đến quyền riêng tư |
| [legal@poli0981.dev](mailto:legal@poli0981.dev) | Điều khoản, giấy phép và các vấn đề pháp lý khác |
| [copyright@poli0981.dev](mailto:copyright@poli0981.dev) | Thông báo bản quyền và yêu cầu gỡ bỏ (takedown) |
| [code@poli0981.dev](mailto:code@poli0981.dev) | Về project và maintainer; báo cáo vi phạm Quy tắc ứng xử |
| [sponsor@poli0981.dev](mailto:sponsor@poli0981.dev) | Tài trợ |

Báo bug và đề xuất tính năng vui lòng gửi qua [GitHub Issues](https://github.com/poli0981/jsonPrism/issues), không gửi qua email.

## Tài liệu project

| Doc | Nội dung |
|---|---|
| [`PRIVACY.md`](PRIVACY.md) | Những gì ở lại trên thiết bị, và các dịch vụ Cloudflare chỉ dùng cho website (hosting, Turnstile, Web Analytics). |
| [`TERMS.md`](TERMS.md) | ToS / EULA — acceptable use, kế thừa giấy phép, quyền sở hữu dữ liệu. |
| [`SECURITY.md`](SECURITY.md) | Cách report vulnerability, SLA. |
| [`DISCLAIMER.md`](DISCLAIMER.md) | Project 1 người + AI-assisted, không bảo hành. |
| [`THIRD-PARTY.md`](THIRD-PARTY.md) | Mỗi dependency: version, giấy phép, link. |
| [`MAINTAINERS.md`](MAINTAINERS.md) | Ai chịu trách nhiệm gì. |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Contributor Covenant v2.1. |
| [`CHANGELOG.md`](CHANGELOG.md) | Ghi chú phát hành của từng phiên bản. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase plan, trạng thái hiện tại. |
| [`docs/i18n/vi/pc_spec.md`](docs/i18n/vi/pc_spec.md) · [`docs/i18n/vi/dev_env.md`](docs/i18n/vi/dev_env.md) | Phần cứng + toolchain của maintainer. |
| [`docs/TAURI-NOTES.md`](docs/TAURI-NOTES.md) | Ghi chú Tauri build / process. |
| [`docs/RESX-MIGRATION.md`](docs/RESX-MIGRATION.md) | Hướng dẫn i18next JSON → .NET RESX. |

## Cộng đồng

Trò chuyện, hỏi đáp, hoặc theo dõi cập nhật:

- [Discord — cộng đồng dev](https://discord.gg/2aNR3aVt)
- [X (Twitter) — @SkullMute0011](https://twitter.com/SkullMute0011)
- [Bluesky — @skullmute0011.bsky.social](https://bsky.app/profile/skullmute0011.bsky.social)
- [Mastodon — @skullmute1122@mastodon.social](https://mastodon.social/@skullmute1122)
- [Telegram — @SkullMute0011](https://t.me/SkullMute0011)
- [YouTube — @SkullMute](https://youtube.com/@SkullMute)

## Ghi nhận

Phần lớn code, test, bản dịch và tài liệu của JSONPrism được draft với
sự hỗ trợ của AI: **Claude Chat** và **Claude Code (Opus 4.7, 1M
context)** cho v1.x, **Claude Code (Opus 5.5)** cho v2.0.0. Xem
[DISCLAIMER.md](DISCLAIMER.md) để biết chi tiết về AI-assist. Bản dịch
tiếng Nhật, tiếng Trung giản thể và một phần bản tiếng Việt do AI tạo,
chất lượng ở mức best-effort — rất hoan nghênh đóng góp từ người bản ngữ.

## Tài trợ

Nếu JSONPrism hữu ích cho bạn, hãy cân nhắc tài trợ maintainer
poli0981 (Kokone) qua một trong các kênh trong
[`.github/FUNDING.yml`](.github/FUNDING.yml): GitHub Sponsors, Ko-fi,
Buy Me a Coffee, Patreon hoặc PayPal. Liên hệ về tài trợ qua email
[sponsor@poli0981.dev](mailto:sponsor@poli0981.dev).

## Giấy phép

[Apache License 2.0](LICENSE) — © 2026 [poli0981](https://github.com/poli0981) (Kokone).
