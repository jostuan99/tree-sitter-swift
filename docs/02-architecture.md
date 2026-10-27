# 02 — Kiến trúc

## 1. Tổng quan luồng build

```
grammar.js ──(tree-sitter generate)──► src/parser.c
                                        src/grammar.json
                                        src/node-types.json
                                        src/tree_sitter/*.h
src/scanner.c  (viết tay) ─────────────┐
                                        ├──► libtree-sitter-swift (.dylib/.so/.wasm)
src/parser.c ──────────────────────────┘           │
                                                    ├── bindings/node   (npm package)
                                                    ├── bindings/c
                                                    ├── bindings/rust
                                                    ├── bindings/swift
                                                    └── bindings/python
queries/*.scm  ──► dùng bởi editor / tree-sitter highlight
```

- `grammar.js`: nguồn sự thật duy nhất của grammar, viết bằng DSL JavaScript của tree-sitter.
- `src/scanner.c`: external scanner cho những token không biểu diễn được bằng regex/context-free (xem `04-external-scanner.md`).
- `src/parser.c` và các file sinh khác: **được commit** vào repo (chuẩn của tree-sitter, giúp người dùng build không cần CLI).

## 2. Cấu trúc thư mục dự kiến

```
tree-sitter-swift/
├── grammar.js                 # grammar chính (ESM, một file)
├── tree-sitter.json           # metadata cho tree-sitter CLI (scope, file-types, queries)
├── src/
│   ├── scanner.c              # external scanner (viết tay)
│   ├── parser.c               # sinh tự động
│   ├── grammar.json           # sinh tự động
│   ├── node-types.json        # sinh tự động
│   └── tree_sitter/           # header sinh tự động
├── queries/
│   ├── highlights.scm
│   ├── locals.scm
│   ├── tags.scm
│   ├── folds.scm
│   ├── indents.scm
│   └── injections.scm
├── test/
│   ├── corpus/                # corpus tests (*.txt)
│   ├── highlight/             # highlight tests (*.swift có annotation)
│   ├── tags/                  # tags tests
│   └── repos/                 # repo clone cho smoke test (gitignored)
├── bindings/                  # sinh bởi `tree-sitter init`, chỉnh tay nếu cần
├── scripts/
│   ├── parse-repos.sh         # clone repo tham chiếu, parse, thống kê lỗi
│   ├── repos.txt              # danh sách repo + tag được ghim
│   ├── compare-repos.sh       # so sánh khai báo với swift-syntax
│   ├── compare-tags.ts        # phần so sánh phía tree-sitter
│   └── compare-swift-syntax/  # executable Swift dùng swift-syntax
├── examples/
│   └── parse.ts               # ví dụ dùng binding Node từ TypeScript
├── .github/workflows/ci.yml
├── docs/
├── package.json
├── binding.gyp
├── Package.swift
├── Cargo.toml
└── Makefile
```

## 3. Vai trò của TypeScript trong repo

Repo hiện được khởi tạo với TypeScript (`tsconfig.json`, `src/index.ts`). Tree-sitter yêu cầu:

- `grammar.js` là JavaScript (CLI tự đánh giá file này). Dùng `/// <reference types="tree-sitter-cli/dsl" />` và JSDoc để có type checking trong editor.
- Thư mục `src/` được tree-sitter dùng cho mã C sinh tự động.

Vì vậy cần sắp xếp lại (xem [ADR-0002](adr/0002-typescript-placement.md)):

- `src/index.ts` đã bị xoá; mã TypeScript nằm ở `examples/`, `scripts/` hoặc `bindings/node/`.
- `tsconfig.json` có `checkJs: true` cho `grammar.js`.

## 4. Thành phần runtime

| Thành phần | Mô tả |
|-----------|-------|
| Lexer nội bộ | Sinh từ các `token(...)`, regex, string literal trong `grammar.js`. Context-aware: chỉ thử token hợp lệ ở state hiện tại. |
| External scanner | Hàm C `tree_sitter_swift_external_scanner_scan` được gọi trước lexer nội bộ khi có token external hợp lệ. Có state serialize/deserialize để hỗ trợ incremental parse. |
| Parser LR(1)/GLR | Bảng parse sinh từ grammar. Conflict khai báo trong `conflicts` sẽ được xử lý bằng GLR runtime. |

## 5. Phiên bản và tương thích

- Tree-sitter CLI: 0.27.1, ghim chính xác trong `package.json` devDependencies.
- ABI: theo mặc định của CLI; ghi rõ trong CHANGELOG khi đổi ABI.
- Node.js: ≥ 20 (máy dev hiện có v24).
- Semver cho package: thay đổi tên node/field = **breaking change** (bump major sau v1.0).
