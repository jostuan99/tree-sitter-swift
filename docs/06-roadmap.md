# 06 — Roadmap

Mỗi milestone kết thúc khi: corpus test của milestone pass, không có conflict chưa giải thích, docs được cập nhật.

Trạng thái ngày 2026-10-26: M0–M9 hoàn thành, trừ bước publish npm. Kết quả đo xem `05-testing.md`, mục 6.

## M0 — Khởi tạo dự án ✅

- [x] Cài `tree-sitter-cli` 0.27.1 (ghim version) làm devDependency.
- [x] Chạy `tree-sitter init`, sắp xếp lại cấu trúc TypeScript theo ADR-0002.
- [x] `grammar.js` với `source_file`, identifier, comment.
- [x] CI: generate + test (`.github/workflows/ci.yml`).

## M1 — Lexical ✅

- [x] Identifier (Unicode, backtick, `$0`, `$identifier`).
- [x] Số: decimal, hex (kể cả hex float), octal, binary, float, exponent, `_`.
- [x] String đơn dòng + interpolation.
- [x] Multi-line string, raw string.
- [x] Block comment lồng nhau.
- [x] Boolean, `nil`.

## M2 — Expressions cơ bản và newline ✅

- [x] `_implicit_semi` và corpus `newlines.txt`.
- [x] Toán tử prefix/infix/postfix.
- [x] Bảng precedence.
- [x] Call, member access, subscript, optional chaining, force unwrap.
- [x] Tuple, array, dictionary literal.
- [x] Ternary, `try`, `await`, cast `is`/`as`.

## M3 — Types và generics ✅

- [x] Type identifier, nested type, optional, IUO, array, dictionary, tuple, function type.
- [x] Generic argument, generic parameter, `where` clause.
- [x] `some`, `any`, composition `&`, metatype, `~Copyable`, parameter packs.

## M4 — Statements ✅

- [x] `let`/`var`, assignment.
- [x] `if`/`guard` (kể cả `if let x`, `case` pattern), `while`, `repeat`, `for-in`.
- [x] `switch` + patterns.
- [x] `do`/`catch` (kể cả typed throws), `defer`, control transfer, labeled statement.

## M5 — Declarations ✅

- [x] `func` (parameters, default value, variadic, `inout`, `async`, `throws(E)`, `rethrows`).
- [x] `class`, `struct`, `enum`, `protocol`, `extension`, `actor`.
- [x] Property: computed, `get`/`set`, observers, property wrapper.
- [x] `init`/`deinit`/`subscript`, `typealias`, `associatedtype`.
- [x] `operator`, `precedencegroup`.
- [x] Modifiers và attributes.

## M6 — Closures và tính năng nâng cao ✅

- [x] Closure: capture list, signature, shorthand, multiple trailing closures.
- [x] Key path, `#selector`, `#keyPath`.
- [x] Regex literal.
- [x] `if`/`switch` expression.
- [x] Macro: `macro` declaration, `#expr`, attached macro.
- [x] Ownership: `consume`, `copy`, `borrowing`, `consuming`, `sending`, `discard`.

## M7 — Compiler directives ✅

- [x] `#if`/`#elseif`/`#else`/`#endif` ở top-level, member, statement, switch case, danh sách attribute.
- [x] `#warning`, `#error`, `#sourceLocation` (parse như macro expansion), `#available`/`#unavailable`.

## M8 — Queries ✅

- [x] `highlights.scm` + highlight test (`test/highlight/`).
- [x] `locals.scm`, `tags.scm` (+ tags test), `folds.scm`, `indents.scm`, `injections.scm`.

## M9 — Hardening và release v1.0 ✅ (trừ publish)

- [x] Xử lý các giới hạn đã biết của 0.1.0: `#if` trong chuỗi postfix, `[Element].Iterator`, generic trong pattern `catch`, type có attribute trong collection literal, editor placeholder, operator Unicode.
- [x] Mở rộng bộ repo tham chiếu: `stdlib/public` của `swiftlang/swift`.
- [x] So sánh với swift-syntax (`05-testing.md`, mục 4): đồng thuận 100%.
- [x] Binding Rust/Python: test parse, chạy trong CI.
- [x] `CHANGELOG.md`.
- [ ] Publish npm (chưa làm theo yêu cầu).
