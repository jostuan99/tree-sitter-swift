# ADR-0002: Vị trí mã TypeScript trong repo

- Trạng thái: Chấp nhận
- Ngày: 2026-10-26

## Bối cảnh

Repo được khởi tạo như project TypeScript: `src/index.ts`, `tsconfig.json` với `include: ["src"]`, `outDir: dist`.
Tree-sitter dùng `src/` cho mã C sinh tự động (`parser.c`, `scanner.c`, `tree_sitter/`) và yêu cầu `grammar.js` là JavaScript.

## Quyết định

1. Xoá `src/index.ts`; `src/` dành riêng cho mã C của tree-sitter.
2. `grammar.js` giữ là JavaScript, thêm `/// <reference types="tree-sitter-cli/dsl" />` và kiểm tra bằng `tsc --checkJs --noEmit`.
3. Mã TypeScript khác đặt tại:
   - `bindings/node/` — type definitions (`index.d.ts`) cho binding.
   - `scripts/` — công cụ smoke test, thống kê.
   - `examples/` — ví dụ dùng `web-tree-sitter` hoặc `tree-sitter` (Node).
4. `tsconfig.json`: `include: ["grammar.js", "grammar/**/*.js", "scripts/**/*.ts", "examples/**/*.ts"]`, `allowJs: true`, `checkJs: true`, `noEmit: true`, `moduleResolution: "bundler"`.
5. `package.json` dùng `"type": "module"`, nên `grammar.js` viết dạng ESM (`export default grammar(...)`).
6. Regex có Unicode property (`\p{L}`) viết bằng `new RegExp('...')`: checker của TypeScript từ chối `\p{}` trong regex literal không có cờ `u`.

## Hệ quả

- Có type checking cho grammar mà không cần bước compile TS.
- `main` trong `package.json` đổi sang binding Node (`bindings/node`) thay vì `dist/index.js`.
