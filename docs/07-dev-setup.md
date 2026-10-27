# 07 — Môi trường phát triển

## 1. Yêu cầu

| Công cụ | Phiên bản | Ghi chú |
|---------|-----------|---------|
| Node.js | ≥ 20 | Chạy tree-sitter CLI qua npm |
| C compiler | clang/gcc hỗ trợ C11 | macOS: Xcode Command Line Tools |
| tree-sitter CLI | ghim trong `package.json` | Cài qua npm: `tree-sitter-cli` |
| Swift toolchain | ≥ 5.9 | Build binding Swift, công cụ so sánh swift-syntax |
| Emscripten hoặc Docker | tuỳ chọn | Build WASM, dùng `tree-sitter playground` |

## 2. Cài đặt

```sh
npm install          # cài dependency và build binding Node
npx tree-sitter --version
```

## 3. Lệnh thường dùng

```sh
# Sinh parser từ grammar.js
npx tree-sitter generate

# Chạy toàn bộ test (corpus + highlight)
npx tree-sitter test

# Chạy test có tên chứa chuỗi
npx tree-sitter test --include "trailing closure"

# Parse một file và in cây
npx tree-sitter parse path/to/File.swift

# Debug: in log lexer/parser, xuất graph
npx tree-sitter parse path/to/File.swift --debug
npx tree-sitter parse path/to/File.swift --debug-graph

# Highlight thử
npx tree-sitter highlight path/to/File.swift

# Playground trên trình duyệt (cần build WASM)
npx tree-sitter build --wasm && npx tree-sitter playground
```

Script trong `package.json`:

| Lệnh | Việc làm |
|------|----------|
| `npm run generate` | Sinh `src/parser.c` từ `grammar.js` |
| `npm run build` | Generate + build thư viện động |
| `npm run test:grammar` | Corpus, highlight, tags test |
| `npm test` | Test grammar + test binding Node |
| `npm run typecheck` | `tsc` cho `grammar.js`, `scripts/`, `examples/` |
| `npm run smoke` | Smoke test trên repo tham chiếu |
| `npm run compare` | So sánh khai báo với swift-syntax (chạy `smoke` trước) |
| `npm start` | Build WASM và mở playground |

Ví dụ dùng binding từ TypeScript (Node ≥ 22.18 chạy trực tiếp file `.ts`):

```sh
node examples/parse.ts path/to/File.swift
```

Binding Swift:

```sh
swift build && swift test
```

Binding Rust và Python:

```sh
cargo test
pip install "tree-sitter~=0.24" . && python -m unittest discover -s bindings/python/tests
```

Python binding cần Python ≥ 3.10.

## 4. Quy trình làm việc

1. Viết corpus test cho construct cần hỗ trợ (test-first).
2. Sửa `grammar.js` (và `scanner.c` nếu cần).
3. `npx tree-sitter generate` — đọc kỹ mọi cảnh báo conflict.
4. `npx tree-sitter test`.
5. Commit cả `grammar.js` lẫn file sinh trong `src/`.

## 5. Quy ước commit

Conventional Commits: `feat(grammar): ...`, `fix(scanner): ...`, `test(corpus): ...`, `docs: ...`, `chore: ...`.
