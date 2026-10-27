# 03 — Thiết kế grammar

Tài liệu này mô tả grammar **đã triển khai** trong `grammar.js`. Corpus test trong `test/corpus/` là đặc tả chính xác của cây cú pháp.

## 1. Quy ước đặt tên

- Rule ẩn (không hiện trong cây) bắt đầu bằng `_`: `_expression`, `_statement`, `_type`, `_declaration`, `_pattern`, `_literal`.
- Node hiện trong cây dùng `snake_case`, đặt theo khái niệm Swift: `function_declaration`, `call_expression`, `optional_type`.
- Hậu tố thống nhất:
  - `*_declaration` cho khai báo (`class_declaration`, `protocol_declaration`).
  - `*_statement` cho câu lệnh (`guard_statement`, `for_statement`).
  - `*_expression` cho biểu thức (`binary_expression`, `closure_expression`).
  - `*_type` cho type (`function_type`, `tuple_type`).
  - `*_pattern` cho pattern (`tuple_pattern`, `enum_case_pattern`).
- Field dùng cho thành phần có ý nghĩa: `name`, `type`, `body`, `value`, `condition`, `parameters`, `return_type`, `arguments`, `function`, `operator`, `left`, `right`, `target`, `member`, `trailing_closures`, `label`, `external_name`, `default_value`, `accessors`.
- `supertypes`: `_expression`, `_statement`, `_declaration`, `_type`, `_pattern`, `_literal`.
- `word: $._alpha_identifier` bật keyword extraction.

## 2. Cấu trúc cây ở mức cao

```
source_file
├── shebang_line?
└── _statement*            (phân cách bằng newline hoặc `;`)
    ├── _declaration       (import, class/struct/actor/enum/protocol/extension, func, init, var/let, ...)
    ├── _expression        (expression statement)
    ├── if/guard/switch/for/while/repeat/do/defer/return/throw/break/continue/...
    └── if_directive       (#if ... #endif)
```

Ví dụ:

```swift
func add(_ a: Int, b: Int) -> Int { a + b }
```

```
(source_file
  (function_declaration
    name: (simple_identifier)
    parameters: (parameter_clause
      (parameter external_name: (wildcard) name: (simple_identifier) type: (user_type (type_identifier)))
      (parameter name: (simple_identifier) type: (user_type (type_identifier))))
    return_type: (user_type (type_identifier))
    body: (code_block
      (binary_expression left: (simple_identifier) right: (simple_identifier)))))
```

Một số quyết định về hình dạng cây:

- Modifier và attribute của khai báo nằm trong một node `modifiers`.
- `if`/`switch` dùng làm biểu thức (SE-0380) vẫn là `if_statement`/`switch_statement`.
- Range một phía `a...` là `binary_expression` không có field `right`; `...a` là `prefix_expression`.
- `case let x as T` cho ra `value_binding_pattern` chứa `cast_expression`.
- `case Foo.bar(let x)` cho ra `call_expression`; đối số có thể là `value_binding_pattern`.
- `case .bar(let x)` cho ra `enum_case_pattern`.

## 3. Bảng precedence

Mã hoá trong hằng `PREC` của `grammar.js`. Custom operator dùng nhóm mặc định (`CUSTOM`).

| Mức (cao → thấp) | Nhóm Swift | Operator | Assoc |
|-------------------|-----------|----------|-------|
| 14 `POSTFIX` | postfix | `?` `!` `.member` `(...)` `[...]` `<T>` | left |
| 13 `PREFIX` | prefix | `!` `-` `+` `~` `&` `...` `..<` custom | right |
| 12 `SHIFT` | BitwiseShift | `<<` `>>` `&<<` `&>>` | left |
| 11 `MULTIPLICATION` | Multiplication | `*` `/` `%` `&*` `&` | left |
| 10 `ADDITION` | Addition | `+` `-` `&+` `&-` `\|` `^` | left |
| 9 `RANGE` | RangeFormation | `...` `..<` | left |
| 8 `CAST` | Casting | `is` `as` `as?` `as!` | left |
| 7 `NIL_COALESCING` | NilCoalescing | `??` | left |
| 6 `COMPARISON` | Comparison | `==` `!=` `<` `>` `<=` `>=` `===` `!==` `~=` | left |
| 5 `CONJUNCTION` | LogicalConjunction | `&&` | left |
| 4 `DISJUNCTION` | LogicalDisjunction | `\|\|` | left |
| 3 `CUSTOM` | Default | custom operator | left |
| 2 `TERNARY` | Ternary | `? :` | right |
| 1 `ASSIGN` | Assignment | `=` `+=` `-=` ... | right |
| -1 `TRY` | — | `try`, `await` (bao toàn bộ vế phải) | right |

Operator nhóm non-associative trong Swift được mã hoá `left`: grammar không cần báo lỗi cho `a < b < c`.

## 4. Các vấn đề khó và cách đã giải quyết

| # | Vấn đề | Cách giải quyết |
|---|--------|-----------------|
| P1 | Newline kết thúc câu lệnh, trừ khi dòng sau là phần tiếp của biểu thức. | External token `_implicit_semi`, chỉ phát khi parser đang chờ dấu kết thúc câu lệnh. Quy tắc chi tiết ở `04-external-scanner.md`. |
| P2 | Phân loại operator theo whitespace. | Trạng thái parser phân biệt prefix/binary. `!` và `?` postfix là token `token.immediate` (không có whitespace phía trước) với lexical precedence cao hơn. Lone `=`/`?` không bao giờ là custom operator. |
| P3 | `<` generic vs so sánh. | `type_arguments` mở bằng `token.immediate('<')`. Trong biểu thức, `generic_specialization_expression` có `prec.dynamic(1)` để GLR ưu tiên cách đọc generic. |
| P4 | String interpolation, multi-line, raw string. | Scanner quét nội dung string. Raw string giữ ngăn xếp số dấu `#` trong state. `\( ... )` parse như danh sách `value_argument`. |
| P5 | Block comment lồng nhau. | Scanner đếm độ sâu (`multiline_comment`). |
| P6 | Regex literal `/.../` vs phép chia. | Scanner chỉ thử khi `regex_literal` hợp lệ (đầu biểu thức), ký tự sau `/` không phải whitespace, và literal kết thúc trên cùng dòng. `#/.../#` cho phép nhiều dòng. |
| P7 | Contextual keyword. | Keyword extraction chỉ coi một từ là keyword ở nơi keyword hợp lệ. Chỉ các modifier có thể đứng đầu khai báo (`open`, `final`, `async`, ...) được liệt kê trong `CONTEXTUAL_KEYWORDS` để vẫn dùng làm identifier ở đầu câu lệnh. Tên kiểu được khai báo (`class X`) không nhận contextual keyword. |
| P8 | Trailing closure sau điều kiện `if`/`while`/`switch`/`for`. | Trailing closure không có đối số chỉ gắn vào callee dạng postfix (`_trailing_closure_callee`, `prec.dynamic(-1)`). Lời gọi có đối số + trailing closure có `prec.dynamic(1)`. GLR giữ cả hai cách đọc, nhánh sai chết khi gặp token tiếp theo. |
| P9 | `#if` ở mọi vị trí. | Hỗ trợ: top-level/statement, member list, switch case (kể cả lồng nhau), danh sách attribute/modifier, và giữa chuỗi postfix (`foo #if os(iOS) .bar() #endif`). Điều kiện dùng biểu thức rút gọn (`_directive_condition`: identifier, call, `!`, `&&`, `\|\|`, ngoặc) nên nhánh bắt đầu bằng `.member` không bị nuốt vào điều kiện. |
| P10 | Attribute có tham số tuỳ ý. | `attribute_argument` chấp nhận: `label: value`, biểu thức, keyword dùng như giá trị (`internal`, `extension`, `init`), `platform version`, `*`, selector `a:b:`, và `where` clause. |
| P11 | `if`/`switch` expression. | Rule `_expression_or_branch` dùng cho initializer, vế phải phép gán và `return`. |
| P12 | Kích thước bảng parse. | Theo dõi `STATE_COUNT` và kích thước `parser.c` trong CI. Hiện tại: khoảng 8.100 state, `parser.c` khoảng 20 MB. |

## 5. Quản lý conflicts

- Mỗi entry trong `conflicts` có comment ví dụ Swift gây ra conflict.
- Thứ tự ưu tiên khi gặp conflict mới:
  1. Cấu trúc lại rule.
  2. `prec` / `prec.left` / `prec.right`.
  3. `prec.dynamic`.
  4. Khai báo conflict GLR.
  5. External scanner.
- Không dùng `prec` để "dập" cảnh báo khi chưa hiểu nguyên nhân.
- Cảnh báo `unnecessary conflicts` khi generate phải được xử lý: xoá entry thừa.

## 6. Extras

`extras: [/\s/, comment, multiline_comment]`. Newline vẫn là extra; scanner tự nhìn thấy newline khi `_implicit_semi` hợp lệ.

## 7. Error recovery

- Các block `{ ... }` là node riêng và là điểm đồng bộ.
- Scanner không phát token string/regex/semicolon khi parser ở chế độ error recovery (`_error_sentinel` hợp lệ).
- `test/corpus/errors.txt` kiểm tra recovery (thiếu `}`, token rác).

## 8. Giới hạn đã biết

Các giới hạn của bản 0.1.0 đã được xử lý trong M9 (xem `CHANGELOG.md`). Còn lại:

- `@MainActor() async throws -> T`: attribute có `()` rỗng ngay trước function type bị đọc là đối số của attribute.
- Cú pháp nội bộ của standard library: `@_effects(notEscaping self.**)`, `_local let`, `@_specialize(...; ...)`.
- Operator Unicode ngoài BMP (U+E0100–U+E01EF).
- Một nhánh `#if` chỉ chứa attribute bị lồng nhiều cấp.
