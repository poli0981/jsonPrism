<div align="center">

# JSONPrism

**Tán sắc JSON ra nhiều định dạng.**

Một JSON đầu vào. Tám định dạng đích. Chạy hoàn toàn trong trình duyệt.

[![CI](https://github.com/poli0981/jsonPrism/actions/workflows/ci.yml/badge.svg)](https://github.com/poli0981/jsonPrism/actions/workflows/ci.yml)
[![Deploy](https://github.com/poli0981/jsonPrism/actions/workflows/deploy.yml/badge.svg)](https://github.com/poli0981/jsonPrism/actions/workflows/deploy.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

[Bản demo](https://poli0981.github.io/jsonPrism/) · [English](README.md) · [Lộ trình](docs/ROADMAP.md)

</div>

---

JSONPrism là công cụ "tán sắc" cho developer. Nhận một JSON đầu vào và phân tách ra nhiều định dạng đích — như ánh sáng trắng đi qua lăng kính. **Mọi thứ chạy client-side**, dữ liệu của bạn không bao giờ rời khỏi máy.

## Định dạng hỗ trợ

| Định dạng         | Phần mở rộng | Trạng thái     |
| ----------------- | ------------ | -------------- |
| JSONL             | `.jsonl`     | ✅ Phase 1      |
| CSV               | `.csv`       | ✅ Phase 1      |
| TSV               | `.tsv`       | ✅ Phase 1      |
| YAML              | `.yaml`      | ✅ Phase 1      |
| XML               | `.xml`       | ✅ Phase 2      |
| TOML              | `.toml`      | ✅ Phase 2      |
| Bảng Markdown     | `.md`        | ✅ Phase 2      |
| SQL `INSERT`      | `.sql`       | ✅ Phase 2      |
| RESX (.NET)       | `.resx`      | ✅ Phase 3      |

## Tính năng

- **Chạy hoàn toàn client-side** — không server, không telemetry, không upload. JSON của bạn ở lại trong trình duyệt.
- **Xử lý batch** — tới 500 file cùng lúc (Phase 2).
- **Phát hiện shape thông minh** — nhận diện flat object, mảng object, scalar; gợi ý format đích phù hợp.
- **Tuỳ chọn theo từng format** — pretty-print, indentation, dialect (SQL), alignment (Markdown), v.v.
- **Theme sáng/tối** — bảng màu Prism Spectrum với violet / cyan / amber / rose.
- **Đa ngôn ngữ EN + VI** — sẵn sàng từ ngày đầu. Hoan nghênh thêm ngôn ngữ khác.
- **Bản desktop Tauri** — drag-and-drop file, hoạt động offline (mốc Phase 2).

## Tech stack

- **Vite 6** + **React 19** + **TypeScript 5.7**
- **Tailwind CSS v4** + **shadcn/ui** (style New York, base neutral)
- **CodeMirror 6** cho editor đầu vào (Phase 1 polish)
- **PapaParse**, **js-yaml**, **smol-toml**, **fast-xml-parser** để parse/serialize
- **i18next** cho dịch thuật, **Zustand** cho state, **Sonner** cho toast
- **Tauri 2** wrapper (Phase 2)

## Bắt đầu nhanh

**Yêu cầu**: Node.js **22 LTS** trở lên.

```bash
git clone https://github.com/poli0981/jsonPrism.git
cd jsonprism
npm install
npm run dev          # http://localhost:5173
```

## Bản desktop (Tauri 2)

JSONPrism cũng có bản desktop native qua Tauri 2. App dùng cùng React UI, với dialog OS native và drag-drop tích hợp vào batch flow hiện có.

**Yêu cầu thêm**:

- **Rust toolchain** (`rustup`) với channel stable
- **Build deps theo platform**:
  - **Windows**: Visual Studio Build Tools (workload C++) + WebView2 (cài sẵn trên Windows 11)
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`, `libssl-dev`

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
- Linux → `src-tauri/target/release/bundle/appimage/*.AppImage` + `deb/*.deb`

**Release tự động**: push tag `v*` sẽ trigger `.github/workflows/release.yml`, build cho tất cả platform song song và tạo draft GitHub release.

### Các script

| Script                | Chức năng                                |
| --------------------- | ---------------------------------------- |
| `npm run dev`         | Chạy Vite dev server với HMR             |
| `npm run build`       | Build production vào `dist/`             |
| `npm run preview`     | Xem trước bản build trên máy local       |
| `npm run lint`        | Chạy ESLint                              |
| `npm run lint:fix`    | Chạy ESLint với autofix                  |
| `npm run typecheck`   | Type-check TypeScript, không emit        |
| `npm run format`      | Format bằng Prettier                     |
| `npm run format:check`| Kiểm tra format (CI dùng cái này)        |

### Components shadcn/ui

`components.json` đã được cấu hình sẵn. Thêm component theo nhu cầu:

```bash
npx shadcn@latest add button input textarea tabs select card dialog sheet \
  dropdown-menu switch badge progress tooltip sonner resizable
```

## Kiến trúc

```
src/
├── app/                 # Router + providers
├── components/
│   ├── ui/              # shadcn components (thêm theo nhu cầu)
│   ├── layout/          # Header, Footer, ThemeToggle
│   ├── converter/       # Workspace, panels, format picker
│   └── common/          # ErrorBoundary, LanguageSwitcher
├── converters/          # Một module cho mỗi định dạng đích
│   ├── types.ts         # Interface Converter
│   ├── registry.ts      # Bảng tra cứu
│   └── *.ts             # Cài đặt theo từng format
├── hooks/               # Custom hooks
├── i18n/                # Dịch thuật (en, vi)
├── lib/                 # detect, theme, utils, sample
├── pages/               # Home, About
├── styles/              # globals.css (Tailwind + theme tokens)
└── main.tsx
```

### Thêm định dạng mới

Mỗi format là một module độc lập, cài đặt interface `Converter`:

```ts
import type { Converter } from './types';

interface MyFormatOptions {
  indent: 2 | 4;
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
  convert({ data }, options) {
    try {
      const output = serialize(data, options);
      return { ok: true, output };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  },
};
```

Sau đó đăng ký nó trong `src/converters/registry.ts` và thêm label key vào `src/i18n/locales/*.json`.

Xem [`docs/ROADMAP.md`](docs/ROADMAP.md) để biết kế hoạch phase đầy đủ.

## Đóng góp

Welcome pull request — vui lòng đọc [`CONTRIBUTING.md`](CONTRIBUTING.md) trước. PR thuộc nhóm **auto-ignored** (code đáng ngờ, lan man không vào vấn đề, không mô tả…) sẽ bị đóng không review.

Báo bug hoặc đề xuất tính năng tại [GitHub Issues](https://github.com/poli0981/jsonPrism/issues). Vấn đề bảo mật vui lòng dùng [Security Advisory riêng tư](https://github.com/poli0981/jsonPrism/security/advisories/new).

## Tài liệu project

| Doc | Nội dung |
|---|---|
| [`PRIVACY.md`](PRIVACY.md) | Offline-first, chỉ localStorage, không telemetry. |
| [`TERMS.md`](TERMS.md) | ToS / EULA — acceptable use, kế thừa giấy phép, quyền sở hữu dữ liệu. |
| [`SECURITY.md`](SECURITY.md) | Cách report vulnerability, SLA. |
| [`DISCLAIMER.md`](DISCLAIMER.md) | Project 1 người + AI-assisted, không bảo hành. |
| [`THIRD-PARTY.md`](THIRD-PARTY.md) | Mỗi dependency: version, giấy phép, link. |
| [`MAINTAINERS.md`](MAINTAINERS.md) | Ai chịu trách nhiệm gì. |
| [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) | Contributor Covenant v2.1. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Phase plan, trạng thái hiện tại. |
| [`docs/i18n/vi/pc_spec.md`](docs/i18n/vi/pc_spec.md) · [`docs/i18n/vi/dev_env.md`](docs/i18n/vi/dev_env.md) | Phần cứng + toolchain của maintainer. |
| [`docs/TAURI-NOTES.md`](docs/TAURI-NOTES.md) | Ghi chú Tauri build / process. |
| [`docs/RESX-MIGRATION.md`](docs/RESX-MIGRATION.md) | Hướng dẫn i18next JSON → .NET RESX. |

## Ghi nhận

Phần lớn code, test, bản dịch và tài liệu của JSONPrism được draft với
**Claude Chat** và **Claude Code (Opus 4.7, 1M context)**. Xem
[DISCLAIMER.md](DISCLAIMER.md) để biết chi tiết về AI-assist. Chất lượng
bản dịch ngôn ngữ ngoài tiếng Anh là best-effort — rất hoan nghênh
đóng góp từ người bản ngữ.

## Tài trợ

Nếu JSONPrism hữu ích cho bạn, hãy cân nhắc tài trợ maintainer qua một
trong các kên trong [`.github/FUNDING.yml`](.github/FUNDING.yml):
GitHub Sponsors, Ko-fi, Buy Me a Coffee, Patreon hoặc PayPal.

## Giấy phép

[Apache License 2.0](LICENSE) — © 2026 Kokone ([@poli0981](https://github.com/poli0981)).
