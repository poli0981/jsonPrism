# Môi trường phát triển

Đây là toolchain mà maintainer luôn cài sẵn cho JSONPrism và các project
anh em. Đây **không** phải yêu cầu bắt buộc để đóng góp — phần lớn
contributor chỉ cần mục **app web**.

## Bắt buộc cho app web

| Công cụ | Tối thiểu | Bản mới nhất đã dùng | Ghi chú |
|---|---|---|---|
| **Node.js** | 26.0.0 | 26.12.1 | `.nvmrc` là `26`; `engines.node` trong [package.json](../../../package.json) là `>=26.0.0`. CI đọc `.nvmrc`. |
| **npm** | 11 (đi kèm Node 26) | 11.20.0 | CI chạy `npm ci` (kèm `--ignore-scripts`). |
| **Git** | bản gần đây (≥ 2.40) | — | Khuyến nghị bật ký commit (`commit.gpgsign=true`). |

**Install script.** npm 11 có thể chặn install script của các dependency.
JSONPrism không cần script nào trong số đó — esbuild, workerd và Tauri CLI tự
tìm binary cho nền tảng lúc chạy — nên cứ để chúng bị chặn. CI cài bằng
`npm ci --ignore-scripts`.

## TypeScript 7 (kèm alias TypeScript 6)

Hai package TypeScript được cài song song:

| Tên trong `package.json` | Thực chất là | Cung cấp |
|---|---|---|
| `@typescript/native` | `typescript@^7` | Binary `tsc`: TypeScript 7, trình biên dịch native mà `npm run typecheck` và `npm run build` dùng. |
| `typescript` | `@typescript/typescript6@^6` | **API** TypeScript 6 (binary `tsc6`) mà typescript-eslint 8.72 cần — peer range của nó là `<6.1`. |

- **`npm run typecheck` là thước đo cuối cùng** (`tsc -b` cộng project
  Worker). CI báo lỗi nếu `tsc` không phải TypeScript 7.
- **WebStorm**: Settings → Languages & Frameworks → TypeScript → TypeScript:
  chọn `<project>/node_modules/typescript` (API TS 6) cho language service,
  hoặc bản preview native của TypeScript 7 theo tài liệu của JetBrains.
  Language service TS 6 trong IDE có thể lệch với TS 7 ở vài trường hợp hiếm;
  khi đó hãy tin `npm run typecheck`.
- Đừng "sửa" alias này. Nó sẽ được gỡ khi TypeScript 7.1 có API mà
  typescript-eslint hỗ trợ; tới lúc đó Dependabot bỏ qua `typescript` ≥ 6.1.
- Quy tắc của TS 7: không còn `baseUrl` (dùng `paths`), `types` mặc định là
  `[]` (mỗi tsconfig tự khai báo), enum và parameter property không "erasable"
  (`erasableSyntaxOnly`).
- Target là ES2025 nhưng `lib` của app là ES2023: đừng dùng API runtime của
  ES2025 (Iterator helpers, các method mới của Set, `Promise.try`,
  `RegExp.escape`). WebView Android (Chromium 111) và WebKit của macOS 12 —
  mức tối thiểu đang hỗ trợ — chưa có các API này.
- Các tsconfig: `tsconfig.app.json` (code chạy trên trình duyệt),
  `tsconfig.test.json` (test), `tsconfig.node.json` (file cấu hình),
  `tsconfig.worker.json` (Cloudflare Worker).

## Cloudflare Worker (chạy local)

`wrangler` nằm trong devDependencies; không cần cài global gì cả.

```bash
cp .dev.vars.example .dev.vars   # một lần — secret test luôn pass của Turnstile
npm run preview:cf               # wrangler dev tại http://localhost:8787 (tự build trước)
```

- `.dev.vars` chứa secret `TURNSTILE_SECRET` của Worker khi chạy local. File
  này đã được gitignore; tuyệt đối không đưa secret production vào đây.
- `npm run preview:cf` phục vụ `dist/` giống hệt production (`_headers`,
  `_redirects`, SPA fallback) cùng với Worker `/api/*`. Trên localhost app
  dùng sitekey test của Cloudflare, nên bước kiểm tra Turnstile trong Consent
  Gate tự pass.
- `npm run cf:types` — tạo lại `worker-configuration.d.ts` (đã gitignore) sau
  khi đổi binding trong `wrangler.jsonc`; `npm run typecheck` cũng chạy lệnh này.
- `npm run cf:check` — `wrangler deploy --dry-run`, giống CI.
- `npm run dev` (Vite) không có Worker và không có Turnstile; đặt
  `VITE_TURNSTILE_DEV=1` nếu vẫn muốn hiện widget.

Phần deploy production nằm trong [docs/DEPLOYMENT.md](../../DEPLOYMENT.md).

## Bắt buộc cho bản desktop Tauri

Ngoài deps của app web:

| Công cụ | Tối thiểu | Bản mới nhất đã dùng | Ghi chú |
|---|---|---|---|
| **Rust** | 1.90 | 1.98.0 | Cài qua `rustup`; channel stable (CI dùng stable). `Cargo.toml` khai báo `rust-version = "1.90"`, đúng mức tối thiểu của tauri 2.12 và tauri-plugin-fs 2.7. |
| **Build deps theo nền tảng** | tuỳ OS | — | Windows: Visual Studio Build Tools (workload C++) + WebView2. macOS: Xcode Command Line Tools. Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev libgtk-3-dev` (đúng các gói CI cài). |

Chạy `npm run tauri:icon` một lần (icon sinh ra đã được gitignore), sau đó
`npm run tauri:dev` hoặc `npm run tauri:build`. CI còn chạy
`cargo fmt --check` và `cargo clippy --all-targets --locked -- -D warnings`
trong `src-tauri/`; hãy chạy hai lệnh này trước khi push thay đổi phía Rust.

## Bắt buộc cho bản Android

Ngoài toolchain desktop:

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| **JDK** | 17+ | Dùng JBR đi kèm Android Studio là được; CI dùng Temurin 17. `JAVA_HOME` phải trỏ tới JDK này. |
| **Android SDK** | Platform 36 | `compileSdk` / `targetSdk` 36, `minSdk` 31. Cài thêm Build-Tools, Platform-Tools, Command-line Tools. `ANDROID_HOME` trỏ tới SDK. |
| **Android NDK** | 27.2.12479018 | Phiên bản CI cố định. `NDK_HOME` → `$ANDROID_HOME/ndk/27.2.12479018`. |
| **Rust targets** | — | `rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android` |

Sau đó chạy `npm run tauri:android:dev` hoặc `npm run tauri:android:build`.
Cách chọn NDK, ký APK và các secret của CI nằm trong
[docs/TAURI-NOTES.md](../../TAURI-NOTES.md#android-sideload-apk).

## Công cụ kiểm tra chất lượng

- `npm run lint` — ESLint 10 (flat config) với typescript-eslint 8.72 và
  eslint-plugin-react-hooks 7 (các rule cho React Compiler).
- `npm run knip` — Knip 6: tìm file, export và dependency không dùng đến
  (`knip.json`). CI có chạy bước này.
- `npm run format` / `npm run format:check` — Prettier 3.9, kèm sắp xếp class
  Tailwind.
- `npm test` — Vitest 5 với hai project: `app` (jsdom) và `worker` (node).
- `npm run test:coverage` — chạy như `npm test` nhưng đo coverage bằng V8; báo
  cáo nằm trong `coverage/` (text, HTML và `lcov.info` — file CI gửi lên
  SonarQube Cloud).

## Tool khác có trên máy maintainer

Không liên quan trực tiếp JSONPrism nhưng ghi lại để ai muốn dựng môi
trường tương đương:

- **Python**: 3.12.x, 3.14.x (cho các project script khác).
- **.NET**: 8.x, 9.x, 10.x, 11.x (preview) — cho project anh em AutoClickForge / PhantomMAC.
- **GPG**: bật ký commit (`commit.gpgsign=true`).

## IDE

- **JetBrains** WebStorm (2026.x) — IDE chính; chạy Prettier + ESLint khi lưu.
  Trỏ TypeScript service vào `node_modules/typescript` (xem ở trên).
- **Visual Studio Code** — phụ; tiện cho phần Tauri/Rust qua `rust-analyzer`.

## Workflow khuyến nghị

```bash
# Một lần
git clone https://github.com/poli0981/jsonPrism.git
cd jsonPrism
npm ci
cp .dev.vars.example .dev.vars

# Hằng ngày
npm run dev              # dev server web, http://localhost:5173
npm run preview:cf       # bản xem trước giống production, có Worker, http://localhost:8787

# Trước khi push (CI chạy đúng các bước này, dùng format:check thay cho format)
npm run format
npm run lint
npm run knip
npm run typecheck
npm run test:coverage
npm run build
npm run cf:check
```

## Tài liệu liên quan

- [docs/pc_spec.md (VI)](pc_spec.md) — phần cứng.
- [docs/TAURI-NOTES.md](../../TAURI-NOTES.md) — ghi chú Tauri.
- [docs/DEPLOYMENT.md](../../DEPLOYMENT.md) — hosting trên Cloudflare và phát hành.
- [README.vi.md](../../../README.vi.md) — giới thiệu project + quick start.
- [English](../../dev_env.md)
