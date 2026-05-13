# Môi trường phát triển

Đây là toolchain mà maintainer giữ cài đặt cho JSONPrism + các project
anh em. **Không** phải yêu cầu bắt buộc để đóng góp — phần lớn
contributor chỉ cần cột **App web**.

## Bắt buộc cho app web

| Tool | Tối thiểu | Đã test | Ghi chú |
|---|---|---|---|
| **Node.js** | 22.11.0 LTS | 25.8.1 | Set trong [package.json](../../../package.json) `engines.node`. |
| **npm** | đi kèm Node | — | `npm ci` là cái CI chạy. |
| **Git** | gần (≥ 2.40) | — | Khuyến nghị commit signing (`commit.gpgsign=true`). |

## Bắt buộc cho bản desktop Tauri

Ngoài deps của app web:

| Tool | Tối thiểu | Ghi chú |
|---|---|---|
| **Rust** | 1.77 (theo `Cargo.toml`) | Cài qua `rustup`; channel stable. |
| **Build deps theo platform** | tuỳ OS | Xem `README.md` § Desktop app để biết list đầy đủ. |

## Tool khác có trên máy maintainer

Không liên quan trực tiếp JSONPrism nhưng ghi lại để ai muốn dựng môi
trường tương đương:

- **Python**: 3.12.x, 3.14.x (cho các project script khác).
- **.NET**: 8.x, 9.x, 10.x, 11.x (preview) — cho project anh em AutoClickForge / PhantomMAC.
- **GPG**: bật commit signing (`commit.gpgsign=true`).

## IDE

- **JetBrains** WebStorm (2026.x) — IDE chính; chạy Prettier + ESLint khi save.
- **Visual Studio Code** — phụ; tiện cho phần Tauri/Rust qua `rust-analyzer`.

## Workflow khuyến nghị

```bash
# Một lần
git clone https://github.com/poli0981/jsonprism.git
cd jsonprism
npm install

# Hằng ngày
npm run dev              # dev server web, http://localhost:5173

# Trước khi push
npm run format
npm run typecheck
npm run lint
npm test
npm run build
```

## Tài liệu liên quan

- [docs/pc_spec.md (VI)](pc_spec.md) — phần cứng.
- [docs/TAURI-NOTES.md](../../TAURI-NOTES.md) — ghi chú Tauri.
- [README.vi.md](../../../README.vi.md) — giới thiệu project + quick start.
- [English](../../dev_env.md)
