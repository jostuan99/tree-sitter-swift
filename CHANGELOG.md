# Changelog

Định dạng theo [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); phiên bản theo [Semantic Versioning](https://semver.org/). Đổi tên node hoặc field là breaking change.

## [Unreleased]

## [0.1.0] - 2026-10-27

### Thêm

- Grammar Swift 5.9–6.x: khai báo, statement, biểu thức, type, pattern, closure, macro, compiler directive.
- `#if` giữa chuỗi postfix (`foo #if os(iOS) .bar() #endif`, node `if_directive` với field `target`, `navigation_suffix`), `#if` lồng trong `switch`; điều kiện `#if` dùng ngôn ngữ biểu thức rút gọn (identifier, call, `!`, `&&`, `||`, ngoặc).
- Type lồng trong array/dictionary type (`[Element].Iterator`, field `base` của `user_type`); type có attribute làm phần tử collection literal (`[UInt64: @Sendable () -> Void]()`).
- Custom operator Unicode theo các dải ký tự của Swift reference; tên operator `.<` trong `func` và `operator`.
- Kết quả `sending` (`-> sending T`); key path `\.!`, `\.?` và key path có root là tuple type.
- Đối số attribute: `platform version` có nhãn (`@backDeployed(before: macOS 14)`), `init`/`init(_:)` (`named(init)`, `@derivative(of: init(_:))`).
- Accessor `unsafeAddress`, `unsafeMutableAddress`; editor placeholder `<#...#>` (node `editor_placeholder`).
- External scanner: kết thúc câu lệnh bằng newline, comment lồng nhau, string, raw string, regex literal.
- Queries: highlights, locals, tags, folds, indents, injections.
- Binding Node (TypeScript types), Swift, Rust, Python, C.
- Test: corpus, highlight, tags, parse test cho binding Rust và Python; smoke test trên repo thật (gồm `swiftlang/swift` `stdlib/public`, clone dạng sparse checkout).
- Công cụ so sánh khai báo với swift-syntax: `scripts/compare-swift-syntax/`, `scripts/compare-tags.ts`, `scripts/compare-repos.sh`.
- CI: build, test grammar, test binding Rust và Python, so sánh swift-syntax.
