# 05 — Chiến lược test

## 1. Các tầng test

| Tầng | Công cụ | Mục đích |
|------|---------|----------|
| Corpus test | `tree-sitter test` với `test/corpus/*.txt` | Đặc tả cây cú pháp cho từng construct |
| Highlight test | `tree-sitter test` với `test/highlight/*.swift` | Kiểm tra `queries/highlights.scm` |
| Tags test | `test/tags/*.swift` | Kiểm tra `tags.scm` |
| Real-world smoke | `scripts/parse-repos.sh` | Đo tỉ lệ file parse không lỗi trên repo thật |
| Binding test | `npm test` (Node), `swift test`, `cargo test` | Đảm bảo binding load và parse được |
| Fuzz | `tree-sitter fuzz` | Tìm crash/hang trong scanner |
| Performance | `tree-sitter parse --time` trên file lớn | Theo dõi G4 |

## 2. Corpus test

Định dạng:

```
==================
Function with return type
==================

func add(a: Int) -> Int { a }

---

(source_file
  (function_declaration
    name: (simple_identifier)
    ...))
```

Tổ chức file theo nhóm:

```
test/corpus/
├── literals.txt
├── strings.txt
├── comments.txt
├── newlines.txt
├── operators.txt
├── expressions.txt
├── closures.txt
├── statements.txt
├── functions.txt
├── classes.txt
├── enums.txt
├── protocols.txt
├── generics.txt
├── types.txt
├── attributes.txt
├── concurrency.txt
├── macros.txt
├── compiler_directives.txt
└── errors.txt          # test error recovery, dùng :error
```

Quy tắc:

- Mỗi bug fix kèm ít nhất một corpus test tái hiện bug.
- Mỗi tính năng mới: test cho trường hợp thường + trường hợp biên (newline, comment xen giữa, Unicode).
- Không sửa expected output hàng loạt bằng `--update` mà không review diff.

## 3. Real-world smoke test

Repo tham chiếu (ghim commit trong `scripts/repos.txt`):

- `swiftlang/swift-syntax`
- `apple/swift-nio`
- `apple/swift-argument-parser`
- `Alamofire/Alamofire`
- `pointfreeco/swift-composable-architecture`
- `vapor/vapor`
- `realm/SwiftLint`
- `swiftlang/swift`, thư mục `stdlib/public` (sparse checkout)

Chạy: `scripts/parse-repos.sh [--min-percent N]`. Script clone repo vào `test/repos/` (gitignored), in tối đa 50 file lỗi và dòng tổng kết. Với `--min-percent`, script trả mã lỗi khi tỉ lệ parse sạch thấp hơn N. CI dùng `--min-percent 99`.

Lưu ý: test suite của compiler Swift chứa mã cố tình sai — loại trừ các file có `// expected-error`.

## 4. So sánh với swift-syntax

Phát hiện cây sai nhưng không có `ERROR`.

- `scripts/compare-swift-syntax/`: package Swift (swift-syntax 600.0.1), executable `swift-syntax-decls` in mỗi khai báo dạng `file<TAB>kind<TAB>name<TAB>line`. Kind trùng với capture `definition.*` của `queries/tags.scm` (`class`, `interface`, `function`, `method`, `macro`, `constant`, `type`).
- `scripts/compare-tags.ts`: chạy `tags.scm` qua binding Node, so hai tập khai báo, in khai báo bị thiếu/thừa và recall/precision.
- `scripts/compare-repos.sh [--min-percent N]`: build tool rồi so sánh trên mọi file trong `test/repos/`. Cần chạy `scripts/parse-repos.sh` trước để clone repo.

Function operator (`static func +`) và property (`definition.field`) không nằm trong phép so sánh.

## 5. CI (GitHub Actions)

File: `.github/workflows/ci.yml`.

Job `test`, matrix `ubuntu-latest` và `macos-latest`:

1. `npm ci` (build binding Node).
2. `npx tree-sitter generate`, rồi `git diff --exit-code -- src/` (file sinh phải được commit).
3. Báo cáo `STATE_COUNT` và kích thước `parser.c`.
4. `npx tree-sitter test` (corpus, highlight, tags).
5. `npx tsc` (type-check `grammar.js`, `scripts/`, `examples/`).
6. `node --test bindings/node/*_test.js`.
7. `swift test` (chỉ macOS).

Job `rust`: `cargo test`. Job `python`: `pip install .` rồi `python -m unittest`.

Job `compare` (macOS): `scripts/compare-repos.sh --min-percent 99.9`, cache build của swift-syntax.

Job `smoke`: `scripts/parse-repos.sh --min-percent 99`, cache `test/repos/`.

Job `fuzz`: `npx tree-sitter fuzz --iterations 100`.

## 6. Kết quả hiện tại (2026-10-26, sau M9)

| Hạng mục | Kết quả |
|----------|---------|
| Corpus test | 148/148 pass |
| Highlight test | 42 assertion pass |
| Tags test | 9 assertion pass |
| Smoke test (8 repo, 2.266 file) | 99.47% file không có `ERROR`/`MISSING` |
| So sánh swift-syntax (3.463 file, 54.510 khai báo) | recall 100%, precision 100% |
| Hiệu năng | file 8.740 dòng parse trong khoảng 17 ms (Apple Silicon) |
| `parser.c` | khoảng 20 MB, khoảng 8.100 state |
| Fuzz (10 vòng mỗi test) | pass |
| Binding Node, Swift, Rust, Python | test pass |

12 file còn lỗi trong smoke test: 6 file code tutorial không hợp lệ của TCA (ký tự `…`, closure dở dang) và 6 file standard library dùng cú pháp nội bộ (`03-grammar-design.md`, mục 8).
