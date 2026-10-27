# 04 — External scanner

File: `src/scanner.c`. Viết bằng C11, không phụ thuộc thư viện ngoài (build được cho WASM).

## 1. Danh sách token external

Thứ tự trong mảng `externals` của `grammar.js` **phải trùng** với enum `TokenType` trong `scanner.c`.

| Token | Mục đích | Vấn đề liên quan |
|-------|----------|------------------|
| `_implicit_semi` | Kết thúc câu lệnh tại newline (token rỗng) | P1 |
| `multiline_comment` | Comment `/* */` lồng nhau (là extra) | P5 |
| `_line_string_content` | Nội dung `"..."` giữa escape/interpolation | P4 |
| `_multiline_string_content` | Nội dung `"""..."""` | P4 |
| `_raw_string_start` | `#"`, `##"`, `#"""` + newline; đẩy ngữ cảnh vào ngăn xếp | P4 |
| `_raw_string_content` | Nội dung raw string | P4 |
| `_raw_string_end` | `"#`, `"""#`, ...; lấy ngữ cảnh ra khỏi ngăn xếp | P4 |
| `_raw_interpolation_start` | `\#(` (số `#` khớp với ngữ cảnh) | P4 |
| `regex_literal` | `/.../` và `#/.../#` | P6 |
| `_error_sentinel` | Không dùng trong rule; hợp lệ nghĩa là parser đang error recovery | — |

`escape_sequence` và `\(` của string thường do lexer nội bộ xử lý (`token.immediate`).

## 2. State

```c
typedef struct {
  uint8_t hashes;   // số dấu '#'
  bool multiline;   // raw string nhiều dòng
} RawString;

typedef struct {
  Array(RawString) raw_strings;  // raw string đang mở, lồng qua interpolation
  bool newline_pending;          // còn nợ một `_implicit_semi` sau block comment
} Scanner;
```

- `serialize` ghi 1 byte cho `newline_pending`, rồi 2 byte cho mỗi raw string đang mở; tổng không vượt `TREE_SITTER_SERIALIZATION_BUFFER_SIZE`.
- State không tỉ lệ với kích thước file.

## 3. Thứ tự xử lý trong `scan`

1. Nếu không ở error recovery và nội dung string hợp lệ: quét nội dung string, **không** bỏ qua whitespace.
2. Bỏ qua whitespace, ghi nhận có gặp newline hay không.
3. Nếu đã gặp newline (hoặc `newline_pending`) và `_implicit_semi` hợp lệ: quyết định phát `_implicit_semi` (mục 4). Nếu token đầu dòng là block comment, scanner phát `multiline_comment` trước; khi câu lệnh kết thúc ở newline đó, nó đặt `newline_pending` để lần quét sau phát `_implicit_semi`.
4. Nếu gặp `/`: `/*` thành `multiline_comment`; nếu `regex_literal` hợp lệ thì thử quét regex.
5. Nếu gặp `#`: đếm số `#`, sau đó `"` thành raw string, `/` thành extended regex.

## 4. Quy tắc `_implicit_semi`

Token rỗng, nằm ở đầu dòng mới. Scanner nhìn qua comment để tìm token thật đầu tiên của dòng mới:

| Token đầu dòng mới | Kết quả |
|--------------------|---------|
| `.member` | tiếp tục (member access) |
| `...x`, `..<x` (không có space sau) | câu lệnh mới (prefix range) |
| operator có whitespace phía sau (`+ b`, `&& c`, `-> T`) | tiếp tục (binary) |
| operator không có whitespace phía sau (`-x`, `!flag`) | câu lệnh mới (prefix) |
| `{`, `:` | tiếp tục |
| `else`, `catch`, `where`, `throws`, `rethrows`, `as`, `is` | tiếp tục |
| `async` (trừ `async let`/`async var`) | tiếp tục |
| `label: {` | tiếp tục (trailing closure có nhãn) |
| `#if ...` mà dòng đầu của nhánh bắt đầu bằng `.member` | tiếp tục (`#if` giữa chuỗi postfix) |
| `)`, `]`, `}`, `,`, `;`, EOF | không phát (không cần) |
| các trường hợp khác (`(`, `[`, identifier, keyword, `#`, `@`, literal) | câu lệnh mới |

Mỗi quy tắc có corpus test trong `test/corpus/newlines.txt`.

Ký tự operator gồm ASCII và các dải Unicode của Swift reference (`is_operator_char`); chúng không được tính là ký tự identifier.

## 5. Quy tắc raw string

- `#"""` chỉ là delimiter nhiều dòng khi theo sau là newline; `#"""#` là raw string chứa một dấu `"`.
- Kết thúc: dấu `"` (hoặc `"""`) theo sau bởi đúng số `#`.
- Interpolation: `\` theo sau bởi đúng số `#` rồi `(`.

## 6. Nguyên tắc triển khai

- Luôn kiểm tra `valid_symbols[...]` trước khi tiêu thụ ký tự.
- Ở error recovery chỉ quét comment.
- Không dùng `malloc` trực tiếp; dùng `ts_calloc`/`Array` từ `tree_sitter/array.h`.
- Mỗi hàm quét một loại token; hàm `scan` chỉ điều phối.
- `tree-sitter fuzz` chạy trong CI.
