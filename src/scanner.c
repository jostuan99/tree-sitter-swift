// External scanner for tree-sitter-swift.
//
// Handles the tokens that cannot be expressed as context-free rules:
//   - implicit statement terminators (newlines),
//   - nested block comments,
//   - string contents (single-line, multi-line, raw strings with `#` delimiters),
//   - regex literals.
//
// See docs/04-external-scanner.md for the design.

#include "tree_sitter/alloc.h"
#include "tree_sitter/array.h"
#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include <wctype.h>

// Must match the order of `externals` in grammar.js.
enum TokenType {
  IMPLICIT_SEMI,
  MULTILINE_COMMENT,
  LINE_STRING_CONTENT,
  MULTILINE_STRING_CONTENT,
  RAW_STRING_START,
  RAW_STRING_CONTENT,
  RAW_STRING_END,
  RAW_INTERPOLATION_START,
  REGEX_LITERAL,
  ERROR_SENTINEL,
};

typedef struct {
  uint8_t hashes;
  bool multiline;
} RawString;

typedef struct {
  Array(RawString) raw_strings;
  // A block comment was emitted right after a newline where the statement
  // ends; the semicolon is emitted by the next scan.
  bool newline_pending;
} Scanner;

static inline void advance(TSLexer *lexer) { lexer->advance(lexer, false); }

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline bool is_newline(int32_t c) { return c == '\n' || c == '\r'; }

static inline bool is_space(int32_t c) { return c == ' ' || c == '\t' || c == '\f' || c == '\v'; }

static bool is_operator_char(int32_t c) {
  switch (c) {
    case '/':
    case '=':
    case '-':
    case '+':
    case '!':
    case '*':
    case '%':
    case '<':
    case '>':
    case '&':
    case '|':
    case '^':
    case '~':
    case '?':
      return true;
    default:
      break;
  }
  // Unicode operator ranges from the Swift reference.
  return (c >= 0x00A1 && c <= 0x00A7) || c == 0x00A9 || c == 0x00AB || c == 0x00AC || c == 0x00AE ||
         (c >= 0x00B0 && c <= 0x00B1) || c == 0x00B6 || c == 0x00BB || c == 0x00BF || c == 0x00D7 ||
         c == 0x00F7 || (c >= 0x2016 && c <= 0x2017) || (c >= 0x2020 && c <= 0x2027) ||
         (c >= 0x2030 && c <= 0x203E) || (c >= 0x2041 && c <= 0x2053) || (c >= 0x2055 && c <= 0x205E) ||
         (c >= 0x2190 && c <= 0x23FF) || (c >= 0x2500 && c <= 0x2775) || (c >= 0x2794 && c <= 0x2BFF) ||
         (c >= 0x2E00 && c <= 0x2E7F) || (c >= 0x3001 && c <= 0x3003) || (c >= 0x3008 && c <= 0x3020) ||
         c == 0x3030;
}

static inline bool is_identifier_char(int32_t c) {
  return c == '_' || c == '$' || iswalnum(c) || (c > 0x7f && !is_operator_char(c));
}

// --- Block comments ---------------------------------------------------------

// Consumes the rest of a block comment; the opening `/*` is already consumed.
static bool consume_block_comment(TSLexer *lexer) {
  unsigned depth = 1;
  while (depth > 0) {
    if (lexer->eof(lexer)) return false;
    if (lexer->lookahead == '/') {
      advance(lexer);
      if (lexer->lookahead == '*') {
        advance(lexer);
        depth++;
      }
    } else if (lexer->lookahead == '*') {
      advance(lexer);
      if (lexer->lookahead == '/') {
        advance(lexer);
        depth--;
      }
    } else {
      advance(lexer);
    }
  }
  return true;
}

// --- Strings ----------------------------------------------------------------

static bool scan_line_string_content(TSLexer *lexer) {
  bool has_content = false;
  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;
    if (c == '"' || c == '\\' || is_newline(c)) break;
    advance(lexer);
    has_content = true;
  }
  lexer->mark_end(lexer);
  lexer->result_symbol = LINE_STRING_CONTENT;
  return has_content;
}

static bool scan_multiline_string_content(TSLexer *lexer) {
  bool has_content = false;
  for (;;) {
    if (lexer->eof(lexer)) break;
    int32_t c = lexer->lookahead;
    if (c == '\\') break;
    if (c == '"') {
      lexer->mark_end(lexer);
      unsigned quotes = 0;
      while (quotes < 3 && lexer->lookahead == '"') {
        advance(lexer);
        quotes++;
      }
      if (quotes == 3) {
        lexer->result_symbol = MULTILINE_STRING_CONTENT;
        return has_content;
      }
      has_content = true;
      continue;
    }
    advance(lexer);
    has_content = true;
  }
  lexer->mark_end(lexer);
  lexer->result_symbol = MULTILINE_STRING_CONTENT;
  return has_content;
}

// Scans `#+"` or `#+"""` after the hashes have been counted.
static bool scan_raw_string_start(Scanner *scanner, TSLexer *lexer, unsigned hashes) {
  if (lexer->lookahead != '"' || hashes > UINT8_MAX) return false;
  advance(lexer);
  bool multiline = false;
  lexer->mark_end(lexer);
  if (lexer->lookahead == '"') {
    advance(lexer);
    if (lexer->lookahead == '"') {
      advance(lexer);
      // `#"""#` is a raw string holding one quote: a multi-line delimiter
      // must be followed by a line break.
      while (is_space(lexer->lookahead)) advance(lexer);
      if (is_newline(lexer->lookahead)) {
        lexer->mark_end(lexer);
        multiline = true;
      }
    }
    // Otherwise `#""#`: an empty raw string, whose start token is `#"`.
  }
  RawString raw = {.hashes = (uint8_t)hashes, .multiline = multiline};
  array_push(&scanner->raw_strings, raw);
  lexer->result_symbol = RAW_STRING_START;
  return true;
}

static bool scan_raw_string_part(Scanner *scanner, TSLexer *lexer) {
  RawString raw = *array_back(&scanner->raw_strings);
  bool has_content = false;
  for (;;) {
    if (lexer->eof(lexer)) {
      lexer->mark_end(lexer);
      lexer->result_symbol = RAW_STRING_CONTENT;
      return has_content;
    }
    int32_t c = lexer->lookahead;
    if (c == '"') {
      lexer->mark_end(lexer);
      unsigned quotes = 0;
      unsigned needed = raw.multiline ? 3 : 1;
      while (quotes < needed && lexer->lookahead == '"') {
        advance(lexer);
        quotes++;
      }
      if (quotes == needed) {
        unsigned hashes = 0;
        while (hashes < raw.hashes && lexer->lookahead == '#') {
          advance(lexer);
          hashes++;
        }
        if (hashes == raw.hashes) {
          if (has_content) {
            lexer->result_symbol = RAW_STRING_CONTENT;
            return true;
          }
          lexer->mark_end(lexer);
          array_pop(&scanner->raw_strings);
          lexer->result_symbol = RAW_STRING_END;
          return true;
        }
      }
      has_content = true;
      continue;
    }
    if (c == '\\') {
      lexer->mark_end(lexer);
      advance(lexer);
      unsigned hashes = 0;
      while (hashes < raw.hashes && lexer->lookahead == '#') {
        advance(lexer);
        hashes++;
      }
      if (hashes == raw.hashes && lexer->lookahead == '(') {
        if (has_content) {
          lexer->result_symbol = RAW_STRING_CONTENT;
          return true;
        }
        advance(lexer);
        lexer->mark_end(lexer);
        lexer->result_symbol = RAW_INTERPOLATION_START;
        return true;
      }
      has_content = true;
      continue;
    }
    if (!raw.multiline && is_newline(c)) {
      lexer->mark_end(lexer);
      lexer->result_symbol = RAW_STRING_CONTENT;
      return has_content;
    }
    advance(lexer);
    has_content = true;
  }
}

// --- Regex literals ---------------------------------------------------------

// Scans the body of a regex literal; the opening `/` (and hashes) are consumed.
static bool scan_regex_body(TSLexer *lexer, unsigned hashes) {
  bool in_class = false;
  bool empty = true;
  for (;;) {
    if (lexer->eof(lexer)) return false;
    int32_t c = lexer->lookahead;
    if (hashes == 0 && is_newline(c)) return false;
    if (c == '\\') {
      advance(lexer);
      if (lexer->eof(lexer)) return false;
      advance(lexer);
      empty = false;
      continue;
    }
    if (c == '[') {
      in_class = true;
    } else if (c == ']') {
      in_class = false;
    } else if (c == '/' && !in_class) {
      advance(lexer);
      unsigned count = 0;
      while (count < hashes && lexer->lookahead == '#') {
        advance(lexer);
        count++;
      }
      if (count == hashes) {
        if (empty && hashes == 0) return false;
        // A bare regex may not end with a space before the closing slash
        // (handled loosely) and must not be followed by an identifier.
        if (hashes == 0 && is_identifier_char(lexer->lookahead)) return false;
        lexer->mark_end(lexer);
        lexer->result_symbol = REGEX_LITERAL;
        return true;
      }
      empty = false;
      continue;
    }
    advance(lexer);
    empty = false;
  }
}

// --- Implicit semicolons ----------------------------------------------------

static const char *const CONTINUATION_KEYWORDS[] = {
  "else", "catch", "where", "throws", "rethrows", "as", "is",
};

// Decides whether the token starting at the lexer position continues the
// previous line. The lexer may be advanced arbitrarily: the caller has already
// marked the end of the (zero-width) semicolon token.
static bool is_continuation(TSLexer *lexer) {
  int32_t c = lexer->lookahead;

  if (c == '{' || c == ':') return true;

  // `#if` whose first branch starts with `.member` continues a postfix chain.
  if (c == '#') {
    advance(lexer);
    if (lexer->lookahead != 'i') return false;
    advance(lexer);
    if (lexer->lookahead != 'f') return false;
    advance(lexer);
    if (is_identifier_char(lexer->lookahead)) return false;
    while (!lexer->eof(lexer) && !is_newline(lexer->lookahead)) advance(lexer);
    while (is_space(lexer->lookahead) || is_newline(lexer->lookahead)) advance(lexer);
    if (lexer->lookahead != '.') return false;
    advance(lexer);
    return lexer->lookahead != '.';
  }

  // `.member` continues the previous line; `...x` and `..<x` are prefix ranges.
  if (c == '.') {
    advance(lexer);
    if (lexer->lookahead != '.') return true;
  }

  if (is_operator_char(c) || c == '.') {
    // A binary operator has whitespace on both sides; a prefix operator has
    // none on its right side and starts a new statement.
    while (is_operator_char(lexer->lookahead) || lexer->lookahead == '.') advance(lexer);
    int32_t next = lexer->lookahead;
    return is_space(next) || is_newline(next) || lexer->eof(lexer);
  }

  if (iswalpha(c) || c == '_') {
    char buffer[16];
    unsigned length = 0;
    while (is_identifier_char(lexer->lookahead)) {
      if (length < sizeof(buffer) - 1) buffer[length] = (char)lexer->lookahead;
      length++;
      advance(lexer);
    }
    if (length < sizeof(buffer)) {
      buffer[length] = '\0';
      // `async` continues a function signature, except in `async let`.
      if (strcmp(buffer, "async") == 0) {
        while (is_space(lexer->lookahead)) advance(lexer);
        if (lexer->lookahead == 'l' || lexer->lookahead == 'v') return false;
        return true;
      }
      for (size_t i = 0; i < sizeof(CONTINUATION_KEYWORDS) / sizeof(CONTINUATION_KEYWORDS[0]); i++) {
        if (strcmp(buffer, CONTINUATION_KEYWORDS[i]) == 0) {
          int32_t next = lexer->lookahead;
          if (strcmp(buffer, "as") == 0 && (next == '?' || next == '!')) return true;
          return !is_identifier_char(next);
        }
      }
    }
    // A labeled trailing closure: `label: {`.
    while (is_space(lexer->lookahead)) advance(lexer);
    if (lexer->lookahead != ':') return false;
    advance(lexer);
    while (is_space(lexer->lookahead)) advance(lexer);
    return lexer->lookahead == '{';
  }

  return false;
}

// Decides whether a statement ends at the newline that was just skipped.
// Only looks ahead: the caller has already marked the end of its token.
static bool needs_implicit_semi(TSLexer *lexer) {
  // Look past comments to find the first real token of the next line.
  for (;;) {
    while (is_space(lexer->lookahead) || is_newline(lexer->lookahead)) advance(lexer);
    if (lexer->lookahead != '/') break;
    advance(lexer);
    if (lexer->lookahead == '/') {
      while (!lexer->eof(lexer) && !is_newline(lexer->lookahead)) advance(lexer);
    } else if (lexer->lookahead == '*') {
      advance(lexer);
      if (!consume_block_comment(lexer)) return true;
    } else {
      // A `/` operator or regex: decide as an operator.
      int32_t next = lexer->lookahead;
      return !(is_space(next) || is_newline(next));
    }
  }

  if (lexer->eof(lexer)) return false;

  switch (lexer->lookahead) {
    case ')':
    case ']':
    case '}':
    case ',':
    case ';':
      return false;
    default:
      return !is_continuation(lexer);
  }
}

// --- Entry points -----------------------------------------------------------

void *tree_sitter_swift_external_scanner_create(void) {
  Scanner *scanner = ts_calloc(1, sizeof(Scanner));
  array_init(&scanner->raw_strings);
  return scanner;
}

void tree_sitter_swift_external_scanner_destroy(void *payload) {
  Scanner *scanner = (Scanner *)payload;
  array_delete(&scanner->raw_strings);
  ts_free(scanner);
}

unsigned tree_sitter_swift_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  unsigned size = 0;
  buffer[size++] = (char)scanner->newline_pending;
  for (uint32_t i = 0; i < scanner->raw_strings.size; i++) {
    if (size + 2 > TREE_SITTER_SERIALIZATION_BUFFER_SIZE) break;
    RawString raw = scanner->raw_strings.contents[i];
    buffer[size++] = (char)raw.hashes;
    buffer[size++] = (char)raw.multiline;
  }
  return size;
}

void tree_sitter_swift_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  array_clear(&scanner->raw_strings);
  scanner->newline_pending = length > 0 && buffer[0] != 0;
  for (unsigned i = 1; i + 1 < length; i += 2) {
    RawString raw = {.hashes = (uint8_t)buffer[i], .multiline = buffer[i + 1] != 0};
    array_push(&scanner->raw_strings, raw);
  }
}

bool tree_sitter_swift_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;
  bool error_recovery = valid_symbols[ERROR_SENTINEL];

  if (!error_recovery) {
    // String contents: whitespace is significant, so no skipping.
    if (valid_symbols[LINE_STRING_CONTENT]) return scan_line_string_content(lexer);
    if (valid_symbols[MULTILINE_STRING_CONTENT]) return scan_multiline_string_content(lexer);
    if ((valid_symbols[RAW_STRING_CONTENT] || valid_symbols[RAW_STRING_END]) && scanner->raw_strings.size > 0) {
      return scan_raw_string_part(scanner, lexer);
    }
  }

  bool saw_newline = false;
  while (is_space(lexer->lookahead) || is_newline(lexer->lookahead)) {
    if (is_newline(lexer->lookahead)) saw_newline = true;
    skip(lexer);
  }

  if (scanner->newline_pending) {
    saw_newline = true;
    scanner->newline_pending = false;
  }

  if (saw_newline && valid_symbols[IMPLICIT_SEMI] && !error_recovery) {
    lexer->mark_end(lexer);
    if (lexer->lookahead == '/') {
      advance(lexer);
      if (lexer->lookahead == '*') {
        // A block comment at the start of the line is emitted first. When the
        // statement ends here, the semicolon follows on the next scan.
        advance(lexer);
        consume_block_comment(lexer);
        lexer->mark_end(lexer);
        lexer->result_symbol = MULTILINE_COMMENT;
        scanner->newline_pending = needs_implicit_semi(lexer);
        return true;
      }
      // A line comment is left to the internal lexer; the newline after it
      // brings the scanner back here.
      if (lexer->lookahead == '/') return false;
      // A `/` operator or regex at the start of the line.
      lexer->result_symbol = IMPLICIT_SEMI;
      return !(is_space(lexer->lookahead) || is_newline(lexer->lookahead));
    }
    lexer->result_symbol = IMPLICIT_SEMI;
    return needs_implicit_semi(lexer);
  }

  if (lexer->lookahead == '/') {
    advance(lexer);
    if (lexer->lookahead == '*') {
      advance(lexer);
      consume_block_comment(lexer);
      lexer->mark_end(lexer);
      lexer->result_symbol = MULTILINE_COMMENT;
      return true;
    }
    if (valid_symbols[REGEX_LITERAL] && !error_recovery && lexer->lookahead != '/' &&
        !is_space(lexer->lookahead) && !is_newline(lexer->lookahead)) {
      return scan_regex_body(lexer, 0);
    }
    return false;
  }

  if (lexer->lookahead == '#' && !error_recovery &&
      (valid_symbols[RAW_STRING_START] || valid_symbols[REGEX_LITERAL])) {
    unsigned hashes = 0;
    while (lexer->lookahead == '#') {
      advance(lexer);
      hashes++;
    }
    if (lexer->lookahead == '"' && valid_symbols[RAW_STRING_START]) {
      return scan_raw_string_start(scanner, lexer, hashes);
    }
    if (lexer->lookahead == '/' && valid_symbols[REGEX_LITERAL]) {
      advance(lexer);
      return scan_regex_body(lexer, hashes);
    }
    return false;
  }

  return false;
}
