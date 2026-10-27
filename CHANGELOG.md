# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); phiên bản theo [Semantic Versioning](https://semver.org/). Đổi tên node hoặc field là breaking change.

## [Unreleased]

### Thêm

- `#if` giữa chuỗi postfix (`foo #if os(iOS) .bar() #endif`): node `if_directive` với `target` và `navigation_suffix`.
- `#if` lồng nhau trong `switch`.
- Điều kiện `#if` dùng ngôn ngữ biểu thức rút gọn (identifier, call, `!`, `&&`, `||`, ngoặc).
- Type lồng trong array/dictionary type: `[Element].Iterator` (field `base` của `user_type`).
- Type có attribute làm phần tử collection literal: `[UInt64: @Sendable () -> Void]()`.
- Editor placeholder `<#...#>` (node `editor_placeholder`).
- Custom operator Unicode (`∪`, `∘`, ...) theo các dải ký tự của Swift reference.
- Tên operator `.<` trong `func` và `operator`.
- Kết quả `sending` (`-> sending T`).
- Key path `\.!`, `\.?`, key path có root là tuple type.
- Đối số attribute: `platform version` có nhãn (`@backDeployed(before: macOS 14)`), `init`/`init(_:)` (`named(init)`, `@derivative(of: init(_:))`).
- Accessor `unsafeAddress`, `unsafeMutableAddress`.
- Công cụ so sánh khai báo với swift-syntax: `scripts/compare-swift-syntax/`, `scripts/compare-tags.ts`, `scripts/compare-repos.sh`.
- `swiftlang/swift` (`stdlib/public`) trong bộ repo tham chiếu; clone dạng sparse checkout.
- Test parse cho binding Rust và Python; CI chạy test binding Rust, Python và so sánh swift-syntax.

### Sửa

- Block comment đứng đầu dòng sau một câu lệnh bị bỏ qua, làm cả phần còn lại của file thành `ERROR`.

## [0.1.0] - 2026-10-26

### Thêm

- Grammar Swift 5.9–6.x: khai báo, statement, biểu thức, type, pattern, closure, macro, compiler directive.
- External scanner: kết thúc câu lệnh bằng newline, comment lồng nhau, string, raw string, regex literal.
- Queries: highlights, locals, tags, folds, indents, injections.
- Binding Node (TypeScript types), Swift, Rust, Python, C.
- Corpus, highlight và tags test; smoke test trên repo thật; CI.
