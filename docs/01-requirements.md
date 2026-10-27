# 01 — Yêu cầu và phạm vi

## 1. Bối cảnh

Tree-sitter là parser generator sinh ra parser GLR incremental bằng C từ một file
`grammar.js`. Parser được dùng trong editor (Neovim, Helix, Zed, VS Code extension),
công cụ phân tích mã, code search, và AI tooling.

Dự án này xây dựng grammar Swift từ đầu, có tham khảo (không sao chép) các nguồn:

- [The Swift Programming Language — Language Reference](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/aboutthelanguagereference/) (grammar chính thức, dạng BNF).
- [swift-syntax](https://github.com/swiftlang/swift-syntax) — parser chính thức viết bằng Swift; dùng làm "oracle" để so sánh kết quả.
- [alex-pinkus/tree-sitter-swift](https://github.com/alex-pinkus/tree-sitter-swift) — grammar cộng đồng hiện có; tham khảo cách giải quyết vấn đề khó (newline, operator, generics).

## 2. Mục tiêu (Goals)

| ID | Mục tiêu |
|----|----------|
| G1 | Parse mã Swift 5.9 – 6.x không lỗi trên ≥ 99% file của các repo tham chiếu (xem `05-testing.md`). |
| G2 | Cây cú pháp có node đặt tên rõ ràng, ổn định, dùng `field` cho các thành phần quan trọng (name, type, body, ...). |
| G3 | Error recovery tốt: một lỗi cục bộ không làm hỏng phần còn lại của file. |
| G4 | Hiệu năng: parse file 10k dòng < 50 ms trên máy dev (Apple Silicon); re-parse incremental < 5 ms. |
| G5 | Có query files: `highlights.scm`, `locals.scm`, `tags.scm`, `folds.scm`, `indents.scm`, `injections.scm`. |
| G6 | Có binding Node.js với type definitions TypeScript; build được bằng `npm install`. |
| G7 | Kích thước `parser.c` hợp lý (mục tiêu < 30 MB, state count được theo dõi trong CI). |

## 3. Non-goals

- Không làm semantic analysis (type checking, name resolution chính xác).
- Không phân biệt ngữ nghĩa phụ thuộc type (ví dụ `a < b > (c)` là generic call hay so sánh — chỉ dùng heuristic cú pháp như compiler Swift).
- Không đánh giá `#if` compile conditions; cả hai nhánh đều được parse.
- Không hỗ trợ Swift < 5.0 một cách đặc thù (cú pháp cũ đã bị loại bỏ có thể parse lỗi).
- Không parse nội dung regex literal thành cây con (để dành cho injection sau này).

## 4. Phạm vi cú pháp

### 4.1 Bắt buộc cho v1.0

- Lexical: identifier (kể cả backtick `` `class` `` và Unicode), số (int/float/hex/octal/binary, `_` separator), string (single-line, multi-line `"""`, raw `#"..."#`, interpolation `\(...)`), comment (line, block lồng nhau, doc comment), regex literal `/.../` và `#/.../#`.
- Khai báo: `import`, `let`/`var` (computed, observers `willSet`/`didSet`), `func`, `init`/`deinit`, `subscript`, `class`, `struct`, `enum` (associated values, raw values, `indirect`), `protocol` (associated types), `extension`, `typealias`, `operator`, `precedencegroup`, `actor`, `macro`.
- Generics: generic parameter clause, `where` clause, `some`/`any`, parameter packs (`each`, `repeat`), primary associated types.
- Statements: `if`/`guard`/`while`/`repeat-while`/`for-in`, `switch` (patterns, `where`, `@unknown default`), `do`/`catch` (typed throws), `defer`, `return`/`throw`/`break`/`continue`/`fallthrough`, labeled statements.
- Expressions: toán tử prefix/infix/postfix (kể cả custom operator), optional chaining, force unwrap, ternary, `try`/`try?`/`try!`, `await`, `consume`/`copy`, closure (capture list, shorthand `$0`, trailing closures nhiều cái), key path `\.a.b`, `if`/`switch` expressions, tuple, array, dictionary, `#selector`, macro expansion `#foo(...)`.
- Types: optional `T?`, IUO `T!`, array `[T]`, dictionary `[K: V]`, tuple, function type (`async`, `throws(E)`), metatype `.Type`/`.Protocol`, composition `A & B`, `~Copyable`.
- Attributes: `@available(...)`, `@MainActor`, property wrappers, result builders, `@attached(...)`, attribute có tham số tuỳ ý.
- Modifiers: access control, `static`, `final`, `override`, `mutating`, `nonisolated`, `consuming`/`borrowing`, `sending`, ...
- Compiler control: `#if`/`#elseif`/`#else`/`#endif`, `#warning`, `#error`, `#sourceLocation`.

### 4.2 Sau v1.0

- Injection cho regex literal, SQL/JSON trong string.
- Các proposal Swift Evolution mới phát sinh sau ngày chốt v1.0.

## 5. Tiêu chí chấp nhận v1.0

1. `tree-sitter generate` chạy không cảnh báo conflict chưa khai báo.
2. Tất cả corpus test pass (`tree-sitter test`).
3. Parse không có node `ERROR`/`MISSING` trên ≥ 99% file của bộ repo tham chiếu.
4. Highlight test pass.
5. CI xanh trên macOS và Linux.
6. Package Node cài và chạy được ví dụ trong README.
