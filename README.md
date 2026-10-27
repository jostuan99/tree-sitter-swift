# tree-sitter-swift

Grammar và parser [tree-sitter](https://tree-sitter.github.io/) cho ngôn ngữ Swift.

> Trạng thái: **M0–M9 hoàn thành** (trừ publish npm). Xem [docs/06-roadmap.md](docs/06-roadmap.md) và [CHANGELOG.md](CHANGELOG.md).
>
> Trên 8 repo Swift thật (kể cả standard library): 99.47% file parse không lỗi; khai báo khớp 100% với swift-syntax.

## Mục tiêu

- Parse được mã Swift hiện đại (Swift 5.x – 6.x) thành concrete syntax tree.
- Parse incremental, chịu lỗi tốt (error recovery) để dùng trong editor.
- Cung cấp query cho highlight, locals, tags, folds, indents.
- Bindings cho Node.js/TypeScript (ưu tiên), sau đó C, Rust, Swift, Python.

## Tài liệu

| File | Nội dung |
|------|----------|
| [docs/01-requirements.md](docs/01-requirements.md) | Phạm vi, mục tiêu, non-goals, tiêu chí chấp nhận |
| [docs/02-architecture.md](docs/02-architecture.md) | Kiến trúc, cấu trúc thư mục, luồng build |
| [docs/03-grammar-design.md](docs/03-grammar-design.md) | Thiết kế grammar: node types, precedence, conflicts |
| [docs/04-external-scanner.md](docs/04-external-scanner.md) | Thiết kế external scanner (`src/scanner.c`) |
| [docs/05-testing.md](docs/05-testing.md) | Chiến lược test và CI |
| [docs/06-roadmap.md](docs/06-roadmap.md) | Các milestone và thứ tự triển khai |
| [docs/07-dev-setup.md](docs/07-dev-setup.md) | Cài đặt môi trường, lệnh thường dùng |
| [docs/adr/](docs/adr/) | Architecture Decision Records |

## Bắt đầu nhanh

```sh
npm install
npx tree-sitter parse path/to/File.swift
npx tree-sitter test
```

Dùng từ TypeScript/Node:

```ts
import Parser from "tree-sitter";
import Swift from "tree-sitter-swift";

const parser = new Parser();
parser.setLanguage(Swift);
const tree = parser.parse("let x = 1");
console.log(tree.rootNode.toString());
```

Chi tiết: [docs/07-dev-setup.md](docs/07-dev-setup.md).

## Dự án dùng grammar này

- **swiftgraph** (repo riêng, thư mục `../swiftgraph`): code graph của dự án Swift cho coding agent, lưu trong SQLite. Phụ thuộc grammar qua `"tree-sitter-swift": "file:../tree-sitter-swift"` cho tới khi package được publish.

## License

MIT (dự kiến).
