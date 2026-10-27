/**
 * @file Swift grammar for tree-sitter
 * @license MIT
 *
 * Design notes live in docs/03-grammar-design.md.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Precedence levels, lowest first. Mirrors the standard library precedence
// groups (see docs/03-grammar-design.md, section 3).
const PREC = {
  TRY: -1,
  ASSIGN: 1,
  TERNARY: 2,
  CUSTOM: 3,
  DISJUNCTION: 4,
  CONJUNCTION: 5,
  COMPARISON: 6,
  NIL_COALESCING: 7,
  CAST: 8,
  RANGE: 9,
  ADDITION: 10,
  MULTIPLICATION: 11,
  SHIFT: 12,
  PREFIX: 13,
  POSTFIX: 14,
  TYPE_COMPOSITION: 1,
  TYPE_FUNCTION: 0,
};

/** @type {Array<[number, string[]]>} */
const BINARY_OPERATORS = [
  [PREC.SHIFT, ['<<', '>>', '&<<', '&>>']],
  [PREC.MULTIPLICATION, ['*', '/', '%', '&*', '&']],
  [PREC.ADDITION, ['+', '-', '&+', '&-', '|', '^']],
  [PREC.RANGE, ['...', '..<']],
  [PREC.NIL_COALESCING, ['??']],
  [PREC.COMPARISON, ['==', '!=', '<', '>', '<=', '>=', '===', '!==', '~=']],
  [PREC.CONJUNCTION, ['&&']],
  [PREC.DISJUNCTION, ['||']],
];

const ALL_BINARY_OPERATORS = BINARY_OPERATORS.flatMap(([, operators]) => operators);

const ASSIGNMENT_OPERATORS = [
  '=', '+=', '-=', '*=', '/=', '%=', '<<=', '>>=', '&=', '|=', '^=', '&+=', '&-=', '&*=',
];

// Comparison operators appear as prefixes in `#if swift(>=5.9)`.
const PREFIX_OPERATORS = ['!', '-', '+', '~', '&', '...', '..<', '<', '>', '<=', '>=', '=='];

// Contextual keywords that can start a declaration (as modifiers) and are
// also common identifiers. Other contextual keywords (`get`, `some`, `left`,
// ...) need no listing: keyword extraction only treats a word as a keyword
// where the keyword is valid, so they stay identifiers everywhere else.
const CONTEXTUAL_KEYWORDS = [
  'async', 'actor', 'macro', 'package', 'consume', 'copy', 'borrowing', 'consuming',
  'mutating', 'nonmutating', 'convenience', 'dynamic', 'final', 'indirect', 'infix',
  'lazy', 'optional', 'override', 'postfix', 'prefix', 'required', 'weak', 'open',
  'nonisolated', 'isolated', 'distributed', 'any', 'discard',
];

// Reserved words that may still follow a `.` or be used as argument labels.
const MEMBER_KEYWORDS = [
  'self', 'init', 'deinit', 'default', 'class', 'struct', 'enum', 'protocol',
  'extension', 'func', 'import', 'let', 'var', 'case', 'if', 'else', 'for', 'in', 'while',
  'repeat', 'return', 'switch', 'where', 'do', 'catch', 'throw', 'throws', 'try', 'is', 'as',
  'nil', 'true', 'false', 'static', 'public', 'private', 'internal', 'fileprivate',
  'operator', 'subscript', 'typealias', 'inout', 'guard', 'break', 'continue', 'defer',
  'fallthrough', 'associatedtype', 'super', 'await', 'rethrows', 'precedencegroup',
];

const MODIFIERS = [
  'public', 'private', 'fileprivate', 'internal', 'open', 'package',
  'static', 'class', 'final', 'override', 'mutating', 'nonmutating', 'convenience',
  'required', 'lazy', 'weak', 'dynamic', 'optional', 'indirect', 'prefix', 'postfix',
  'infix', 'nonisolated', 'distributed', 'consuming', 'borrowing', '__consuming', 'async',
];

// Operator characters: ASCII plus the Unicode ranges of the Swift reference
// (operator-head and combining operator-character ranges in the BMP).
const OPERATOR_CHARS = '/=\\-+!*%<>&|^~?' + [
  '\\u00A1-\\u00A7', '\\u00A9', '\\u00AB', '\\u00AC', '\\u00AE', '\\u00B0-\\u00B1',
  '\\u00B6', '\\u00BB', '\\u00BF', '\\u00D7', '\\u00F7', '\\u2016-\\u2017',
  '\\u2020-\\u2027', '\\u2030-\\u203E', '\\u2041-\\u2053', '\\u2055-\\u205E',
  '\\u2190-\\u23FF', '\\u2500-\\u2775', '\\u2794-\\u2BFF', '\\u2E00-\\u2E7F',
  '\\u3001-\\u3003', '\\u3008-\\u3020', '\\u3030',
  '\\u0300-\\u036F', '\\u1DC0-\\u1DFF', '\\u20D0-\\u20FF', '\\uFE00-\\uFE0F', '\\uFE20-\\uFE2F',
].join('');

export default grammar({
  name: 'swift',

  externals: $ => [
    $._implicit_semi,
    $.multiline_comment,
    $._line_string_content,
    $._multiline_string_content,
    $._raw_string_start,
    $._raw_string_content,
    $._raw_string_end,
    $._raw_interpolation_start,
    $.regex_literal,
    $._error_sentinel,
  ],

  extras: $ => [/\s/, $.comment, $.multiline_comment],

  word: $ => $._alpha_identifier,

  supertypes: $ => [
    $._expression,
    $._statement,
    $._declaration,
    $._type,
    $._pattern,
    $._literal,
  ],

  inline: $ => [
    $._semi,
    $._member_name,
    $._argument_label,
  ],

  // Every entry is resolved at runtime by the GLR parser. See
  // docs/03-grammar-design.md, section 5.
  conflicts: $ => [
    // Contextual keywords that are also identifiers: `open(x)` vs `open func`,
    // `{ async in }`, `macro(x)`, `(borrowing x: T)`, `any(x)` vs `any P`.
    [$.simple_identifier, $.modifier],
    [$.simple_identifier, $.macro_declaration],
    [$.simple_identifier, $.parameter_modifier],
    [$.simple_identifier, $.closure_signature],
    [$.simple_identifier, $.existential_type],
    // `{ @MainActor in ... }` vs `{ @MainActor func f() {} }`.
    [$.closure_signature, $.modifiers],
    // `public class func f()` vs `public class Foo {}`: needs two tokens of lookahead.
    [$.modifiers],
    // `#if` blocks wrapping attributes vs statements or members.
    [$._attribute_if_directive, $.modifiers],
    [$._statement_if_directive, $._attribute_if_directive],
    [$._member_if_directive, $._attribute_if_directive],
    // `default: stmt` followed by `#if`: a statement directive or a case directive.
    [$._statements],
    [$.switch_case],
    // `if x {`: a trailing closure or the statement body.
    [$._expression, $._trailing_closure_callee],
    [$.call_expression],
    // Patterns overlap with expressions: `case (a, b)`, `case .some(x)`.
    [$.tuple_expression, $.tuple_pattern],
    [$._tuple_expression_item, $._pattern],
    [$.implicit_member_expression, $.enum_case_pattern],
    // `{ (a, b) in }` and `{ [a] in }` vs tuple and array expressions.
    [$._expression, $.closure_parameter],
    [$._expression, $.capture_list_item],
    // `{ (a: Int) -> Int in }` vs `(a: Int)` as a tuple expression.
    [$.tuple_expression, $.tuple_type],
    [$._type, $.function_type],
    [$._expression, $._type],
    [$._expression, $._simple_user_type],
    // `var x: T { get async }` vs `{ init async ... }` statements.
    [$.accessor],
    [$.modifiers, $.accessor],
    // `foo(a:b:)` function references vs `foo(a: b)`.
    [$.value_argument, $.function_reference_label],
    // Free-form attribute arguments: `@objc(a:b:)`, `@available(iOS 15, *)`.
    [$.attribute_argument],
    // `any [T].Element`: a nested type with an array base.
    [$._type, $.user_type],
    // `[@Sendable () -> Void]`: a type or an attributed collection element.
    [$._collection_element, $._type],
    // `catch {}` followed by `#if`: a statement directive or a postfix directive
    // on a closure.
    [$.code_block, $.closure_expression],
  ],

  rules: {
    source_file: $ => seq(
      optional($.shebang_line),
      optional($._statements),
    ),

    shebang_line: _ => token(seq('#!', /.*/)),

    // ------------------------------------------------------------------
    // Lexical
    // ------------------------------------------------------------------

    comment: _ => token(seq('//', /.*/)),

    // Unicode classes are built from strings: TypeScript's checker rejects `\p{}`
    // in regex literals without the `u` flag, which tree-sitter does not use.
    _alpha_identifier: _ => new RegExp('[\\p{L}_][\\p{L}\\p{Nd}\\p{Mn}\\p{Mc}_$]*'),

    simple_identifier: $ => choice(
      $._alpha_identifier,
      /`[^`\r\n]+`/,
      /\$[0-9]+/,
      new RegExp('\\$[\\p{L}_][\\p{L}\\p{Nd}\\p{Mn}\\p{Mc}_]*'),
      ...CONTEXTUAL_KEYWORDS,
    ),

    // Names of declared types: contextual keywords are excluded so that
    // `class` stays unambiguous between a declaration and a modifier.
    _declared_type_name: $ => alias(choice($._alpha_identifier, /`[^`\r\n]+`/), $.type_identifier),

    _declared_name: $ => alias(choice($._alpha_identifier, /`[^`\r\n]+`/), $.simple_identifier),

    _member_name: $ => choice(
      $.simple_identifier,
      alias(choice(...MEMBER_KEYWORDS), $.simple_identifier),
    ),

    _argument_label: $ => choice(
      $.simple_identifier,
      alias(choice(...MEMBER_KEYWORDS), $.simple_identifier),
    ),

    _semi: $ => choice($._implicit_semi, ';'),

    _literal: $ => choice(
      $.integer_literal,
      $.hex_literal,
      $.oct_literal,
      $.bin_literal,
      $.real_literal,
      $.boolean_literal,
      $.nil,
      $.line_string_literal,
      $.multi_line_string_literal,
      $.raw_string_literal,
      $.regex_literal,
    ),

    integer_literal: _ => /[0-9][0-9_]*/,
    hex_literal: _ => /0x[0-9a-fA-F][0-9a-fA-F_]*(\.[0-9a-fA-F][0-9a-fA-F_]*)?([pP][+-]?[0-9][0-9_]*)?/,
    oct_literal: _ => /0o[0-7][0-7_]*/,
    bin_literal: _ => /0b[01][01_]*/,
    real_literal: _ => token(choice(
      /[0-9][0-9_]*\.[0-9][0-9_]*([eE][+-]?[0-9][0-9_]*)?/,
      /[0-9][0-9_]*[eE][+-]?[0-9][0-9_]*/,
    )),
    boolean_literal: _ => choice('true', 'false'),
    nil: _ => 'nil',

    line_string_literal: $ => seq(
      '"',
      repeat(choice(
        alias($._line_string_content, $.string_content),
        $.escape_sequence,
        $.interpolation,
      )),
      '"',
    ),

    multi_line_string_literal: $ => seq(
      '"""',
      repeat(choice(
        alias($._multiline_string_content, $.string_content),
        $.escape_sequence,
        $.interpolation,
      )),
      '"""',
    ),

    raw_string_literal: $ => seq(
      $._raw_string_start,
      repeat(choice(
        alias($._raw_string_content, $.string_content),
        alias($._raw_interpolation, $.interpolation),
      )),
      $._raw_string_end,
    ),

    escape_sequence: _ => token.immediate(prec(1, choice(
      /\\[0\\tnr"']/,
      /\\u\{[0-9a-fA-F]{1,8}\}/,
      /\\[ \t]*\r?\n/,
    ))),

    interpolation: $ => seq(
      token.immediate('\\('),
      commaSep1($.value_argument),
      ')',
    ),

    _raw_interpolation: $ => seq(
      $._raw_interpolation_start,
      commaSep1($.value_argument),
      ')',
    ),

    // A lone `=` or `?` is reserved punctuation, never an operator.
    custom_operator: _ => token(choice(
      new RegExp(`[${OPERATOR_CHARS.replace('=', '').replace('?', '')}]`),
      new RegExp(`[${OPERATOR_CHARS}][${OPERATOR_CHARS}]+`),
      new RegExp(`\\.[${OPERATOR_CHARS}.]+`),
    )),

    // ------------------------------------------------------------------
    // Statements
    // ------------------------------------------------------------------

    _statements: $ => seq(
      $._statement,
      repeat(seq($._semi, $._statement)),
      optional($._semi),
    ),

    _statement: $ => choice(
      $._expression,
      $._declaration,
      $.if_statement,
      $.guard_statement,
      $.switch_statement,
      $.for_statement,
      $.while_statement,
      $.repeat_while_statement,
      $.do_statement,
      $.defer_statement,
      $.return_statement,
      $.throw_statement,
      $.break_statement,
      $.continue_statement,
      $.fallthrough_statement,
      $.labeled_statement,
      $.discard_statement,
      $.yield_statement,
      alias($._statement_if_directive, $.if_directive),
    ),

    code_block: $ => seq('{', optional($._statements), '}'),

    if_statement: $ => prec.right(seq(
      'if',
      field('condition', $.condition_list),
      field('consequence', $.code_block),
      optional(seq(
        'else',
        field('alternative', choice($.if_statement, $.code_block)),
      )),
    )),

    guard_statement: $ => seq(
      'guard',
      field('condition', $.condition_list),
      'else',
      field('body', $.code_block),
    ),

    condition_list: $ => commaSep1($._condition),

    _condition: $ => choice(
      $._expression,
      $.availability_condition,
      $.optional_binding_condition,
      $.case_condition,
    ),

    optional_binding_condition: $ => seq(
      choice('let', 'var'),
      field('name', $._binding_pattern),
      optional($.type_annotation),
      optional(seq('=', field('value', $._expression))),
    ),

    case_condition: $ => seq(
      'case',
      field('pattern', $._pattern),
      optional($.type_annotation),
      '=',
      field('value', $._expression),
    ),

    availability_condition: $ => seq(
      choice('#available', '#unavailable'),
      '(',
      commaSep1(choice(
        seq($.simple_identifier, optional($._version)),
        '*',
      )),
      ')',
    ),

    _platform_version: $ => seq($.simple_identifier, $._version),

    _version: $ => choice($.integer_literal, $.real_literal, $.version_literal),

    version_literal: _ => /[0-9]+\.[0-9]+\.[0-9]+/,

    switch_statement: $ => seq(
      'switch',
      field('value', $._expression),
      '{',
      repeat(choice($.switch_case, alias($._switch_if_directive, $.if_directive))),
      '}',
    ),

    switch_case: $ => seq(
      repeat($.attribute),
      choice(
        seq('case', commaSep1($.switch_pattern), ':'),
        seq($.default_keyword, ':'),
      ),
      optional($._statements),
    ),

    default_keyword: _ => 'default',

    switch_pattern: $ => seq(
      $._pattern,
      optional(seq('where', field('guard', $._expression))),
    ),

    for_statement: $ => seq(
      'for',
      optional('try'),
      optional('await'),
      optional('case'),
      field('pattern', $._pattern),
      optional($.type_annotation),
      'in',
      field('collection', $._expression),
      optional(seq('where', field('guard', $._expression))),
      field('body', $.code_block),
    ),

    while_statement: $ => seq(
      'while',
      field('condition', $.condition_list),
      field('body', $.code_block),
    ),

    repeat_while_statement: $ => seq(
      'repeat',
      field('body', $.code_block),
      'while',
      field('condition', $._expression),
    ),

    do_statement: $ => prec.right(seq(
      'do',
      optional($.throws_clause),
      field('body', $.code_block),
      repeat($.catch_block),
    )),

    catch_block: $ => seq(
      'catch',
      optional(commaSep1($._pattern)),
      optional(seq('where', field('guard', $._expression))),
      field('body', $.code_block),
    ),

    defer_statement: $ => seq('defer', field('body', $.code_block)),

    return_statement: $ => prec.right(seq('return', optional($._expression_or_branch))),

    throw_statement: $ => prec.right(seq('throw', $._expression)),

    break_statement: $ => prec.right(seq('break', optional(field('label', $.simple_identifier)))),

    continue_statement: $ => prec.right(seq('continue', optional(field('label', $.simple_identifier)))),

    fallthrough_statement: _ => 'fallthrough',

    discard_statement: $ => seq('discard', $.self_expression),

    yield_statement: $ => prec.right(seq('yield', $._expression)),

    labeled_statement: $ => seq(
      field('label', $.simple_identifier),
      ':',
      choice(
        $.for_statement,
        $.while_statement,
        $.repeat_while_statement,
        $.if_statement,
        $.switch_statement,
        $.do_statement,
      ),
    ),

    // `if` and `switch` used as expressions (SE-0380).
    _expression_or_branch: $ => choice($._expression, $.if_statement, $.switch_statement),

    // ------------------------------------------------------------------
    // Compiler control
    // ------------------------------------------------------------------

    // Conditions are a restricted expression language, so a branch that starts
    // with `.member` is never read as part of the condition.
    _directive_condition: $ => choice(
      $.simple_identifier,
      $.boolean_literal,
      $.integer_literal,
      alias($._directive_call, $.call_expression),
      alias($._directive_negation, $.prefix_expression),
      alias($._directive_binary, $.binary_expression),
      alias($._directive_parenthesized, $.tuple_expression),
    ),

    // `#if os(iOS)`; a `(` on the next line starts the branch instead (the
    // scanner ends the condition at the newline).
    _directive_call: $ => prec(1, seq(
      field('function', $.simple_identifier),
      field('arguments', $.value_arguments),
    )),

    _directive_negation: $ => prec(PREC.PREFIX, seq(
      field('operator', '!'),
      field('operand', $._directive_condition),
    )),

    _directive_binary: $ => choice(
      prec.left(PREC.CONJUNCTION, seq(
        field('left', $._directive_condition),
        field('operator', '&&'),
        field('right', $._directive_condition),
      )),
      prec.left(PREC.DISJUNCTION, seq(
        field('left', $._directive_condition),
        field('operator', '||'),
        field('right', $._directive_condition),
      )),
    ),

    _directive_parenthesized: $ => seq('(', field('value', $._directive_condition), ')'),

    _statement_if_directive: $ => directive($, optional($._statements)),
    _member_if_directive: $ => directive($, optional($._members)),
    _attribute_if_directive: $ => directive($, repeat(choice($.attribute, $.modifier))),
    _switch_if_directive: $ => directive($, repeat(choice(
      $.switch_case,
      alias($._switch_if_directive, $.if_directive),
    ))),

    // `#if` inside a postfix chain:
    //   foo
    //   #if os(iOS)
    //     .bar()
    //   #endif
    _postfix_if_directive: $ => prec.left(PREC.POSTFIX, seq(
      field('target', $._expression),
      directive($, repeat($._postfix_suffix)),
    )),

    _postfix_suffix: $ => choice(
      $.navigation_suffix,
      $.value_arguments,
      $.trailing_closures,
      seq('[', commaSep1($.value_argument), optional(','), ']'),
      alias($._immediate_bang, '!'),
      alias($._immediate_quest, '?'),
    ),

    navigation_suffix: $ => seq('.', field('member', $._member_name)),

    // ------------------------------------------------------------------
    // Expressions
    // ------------------------------------------------------------------

    _expression: $ => choice(
      $.simple_identifier,
      $._literal,
      $.self_expression,
      $.super_expression,
      $.wildcard,
      $.prefix_expression,
      $.postfix_expression,
      $.binary_expression,
      $.assignment_expression,
      $.ternary_expression,
      $.cast_expression,
      $.check_expression,
      $.try_expression,
      $.await_expression,
      $.consume_expression,
      $.call_expression,
      $.subscript_expression,
      $.navigation_expression,
      $.implicit_member_expression,
      $.generic_specialization_expression,
      $.tuple_expression,
      $.array_literal,
      $.dictionary_literal,
      $.closure_expression,
      $.key_path_expression,
      $.macro_expansion_expression,
      $.selector_expression,
      $.operator_reference,
      // `(any Error).self`
      $.existential_type,
      alias($._postfix_if_directive, $.if_directive),
      $.editor_placeholder,
    ),

    self_expression: _ => 'self',
    super_expression: _ => 'super',
    wildcard: _ => '_',

    prefix_expression: $ => prec(PREC.PREFIX, seq(
      field('operator', choice(...PREFIX_OPERATORS, $.custom_operator)),
      field('operand', $._expression),
    )),

    postfix_expression: $ => prec.left(PREC.POSTFIX, seq(
      field('operand', $._expression),
      field('operator', choice(
        alias($._immediate_bang, '!'),
        alias($._immediate_quest, '?'),
      )),
    )),

    _immediate_bang: _ => token.immediate(prec(2, '!')),
    _immediate_quest: _ => token.immediate(prec(2, '?')),

    binary_expression: $ => choice(
      ...BINARY_OPERATORS.map(([precedence, operators]) => prec.left(precedence, seq(
        field('left', $._expression),
        field('operator', operators.length > 1 ? choice(...operators) : operators[0]),
        field('right', $._expression),
      ))),
      prec.left(PREC.CUSTOM, seq(
        field('left', $._expression),
        field('operator', $.custom_operator),
        field('right', $._expression),
      )),
      // One-sided range `a...` (`arr[2...]`).
      prec.left(PREC.RANGE, seq(
        field('left', $._expression),
        field('operator', '...'),
      )),
    ),

    assignment_expression: $ => prec.right(PREC.ASSIGN, seq(
      field('target', $._expression),
      field('operator', choice(...ASSIGNMENT_OPERATORS)),
      field('value', $._expression_or_branch),
    )),

    ternary_expression: $ => prec.right(PREC.TERNARY, seq(
      field('condition', $._expression),
      '?',
      field('consequence', $._expression),
      ':',
      field('alternative', $._expression),
    )),

    cast_expression: $ => prec.left(PREC.CAST, seq(
      field('value', $._expression),
      field('operator', choice('as', 'as?', 'as!')),
      field('type', $._type),
    )),

    check_expression: $ => prec.left(PREC.CAST, seq(
      field('value', $._expression),
      'is',
      field('type', $._type),
    )),

    try_expression: $ => prec.right(PREC.TRY, seq(
      field('operator', choice('try', 'try?', 'try!')),
      field('expression', $._expression),
    )),

    await_expression: $ => prec.right(PREC.TRY, seq(
      'await',
      field('expression', $._expression),
    )),

    consume_expression: $ => prec.dynamic(-1, prec.right(PREC.PREFIX, seq(
      choice('consume', 'copy'),
      field('expression', $._expression),
    ))),

    // Trailing closures attach only to postfix-shaped callees. Inside `if`,
    // `while`, `switch`, ... the `{` after a bare callee is ambiguous with the
    // statement body; the GLR parser keeps both and drops the dead branch.
    call_expression: $ => choice(
      prec(PREC.POSTFIX, seq(
        field('function', $._expression),
        field('arguments', $.value_arguments),
      )),
      prec.dynamic(1, prec(PREC.POSTFIX, seq(
        field('function', $._expression),
        field('arguments', $.value_arguments),
        field('trailing_closures', $.trailing_closures),
      ))),
      prec.dynamic(-1, seq(
        field('function', $._trailing_closure_callee),
        field('trailing_closures', $.trailing_closures),
      )),
    ),

    _trailing_closure_callee: $ => choice(
      $.simple_identifier,
      $.self_expression,
      $.super_expression,
      $.navigation_expression,
      $.subscript_expression,
      $.generic_specialization_expression,
      $.implicit_member_expression,
      $.postfix_expression,
    ),

    trailing_closures: $ => prec.left(seq(
      $.closure_expression,
      repeat(seq(field('label', $._argument_label), ':', $.closure_expression)),
    )),

    value_arguments: $ => choice(
      seq('(', optional(commaSep1($.value_argument)), optional(','), ')'),
      seq('(', repeat1($.function_reference_label), ')'),
    ),

    value_argument: $ => choice(
      seq(
        optional(seq(field('name', $._argument_label), ':')),
        // Binding patterns appear in `case Foo.bar(let x)`; init references in `named(init)`.
        field('value', choice($._expression, $.value_binding_pattern, $._init_reference)),
      ),
      seq(field('name', $._argument_label), ':'),
    ),

    // `named(init)`, `named(init(from:))`
    _init_reference: $ => choice(
      alias('init', $.simple_identifier),
      alias($._init_call, $.call_expression),
    ),

    _init_call: $ => seq(
      field('function', alias('init', $.simple_identifier)),
      field('arguments', $.value_arguments),
    ),

    function_reference_label: $ => seq(choice($._argument_label, $.wildcard), ':'),

    operator_reference: $ => prec(-1, choice(
      $.custom_operator,
      ...ALL_BINARY_OPERATORS.filter(op => op !== '&'),
    )),

    subscript_expression: $ => prec.left(PREC.POSTFIX, seq(
      field('value', $._expression),
      '[',
      commaSep1($.value_argument),
      optional(','),
      ']',
    )),

    navigation_expression: $ => prec.left(PREC.POSTFIX, seq(
      field('target', $._expression),
      '.',
      field('member', choice(
        $._member_name,
        alias(token.immediate(/[0-9]+/), $.integer_literal),
      )),
    )),

    implicit_member_expression: $ => prec.right(seq('.', field('member', $._member_name))),

    generic_specialization_expression: $ => prec.dynamic(1, prec.left(PREC.POSTFIX, seq(
      field('name', $._expression),
      field('type_arguments', $.type_arguments),
    ))),

    tuple_expression: $ => seq(
      '(',
      optional(seq(commaSep1($._tuple_expression_item), optional(','))),
      ')',
    ),

    _tuple_expression_item: $ => seq(
      optional(seq(field('name', $._argument_label), ':')),
      // Same precedence as an expression pattern, so `case (a)...b` keeps both readings.
      field('value', prec.left(PREC.ASSIGN, $._expression)),
    ),

    array_literal: $ => seq(
      '[',
      optional(seq(commaSep1($._collection_element), optional(','))),
      ']',
    ),

    // Types with attributes only appear in expressions as collection
    // elements: `[UInt64: @Sendable () -> Void]()`.
    _collection_element: $ => choice($._expression, $.attributed_type),

    dictionary_literal: $ => seq(
      '[',
      choice(
        ':',
        seq(commaSep1($.dictionary_element), optional(',')),
      ),
      ']',
    ),

    dictionary_element: $ => seq(
      field('key', $._expression),
      ':',
      field('value', $._collection_element),
    ),

    closure_expression: $ => seq(
      '{',
      optional($.closure_signature),
      optional($._statements),
      '}',
    ),

    closure_signature: $ => seq(
      repeat($.attribute),
      optional($.capture_list),
      optional(choice(
        $.closure_parameters,
        alias($.closure_parameter_names, $.closure_parameters),
      )),
      optional('async'),
      optional($.throws_clause),
      optional(seq('->', optional('sending'), field('return_type', $._type))),
      'in',
    ),

    capture_list: $ => seq('[', commaSep1($.capture_list_item), ']'),

    capture_list_item: $ => choice(
      seq(optional($.ownership_modifier), $.simple_identifier, optional(seq('=', $._expression))),
      seq(optional($.ownership_modifier), $.self_expression),
    ),

    ownership_modifier: _ => choice(
      'weak',
      'unowned',
      seq('unowned', token.immediate('('), choice('safe', 'unsafe'), ')'),
    ),

    closure_parameters: $ => seq('(', optional(commaSep1($.closure_parameter)), ')'),

    closure_parameter_names: $ => commaSep1(alias($._closure_parameter_name, $.closure_parameter)),

    _closure_parameter_name: $ => choice($.simple_identifier, $.wildcard),

    closure_parameter: $ => seq(
      optional(field('external_name', choice($.simple_identifier, $.wildcard))),
      field('name', choice($.simple_identifier, $.wildcard)),
      optional(seq(':', repeat($.parameter_modifier), field('type', $._type), optional('...'))),
    ),

    key_path_expression: $ => prec.right(seq(
      '\\',
      optional(field('root', choice($._simple_user_type, $.array_type, $.dictionary_type, $.tuple_type))),
      repeat1($._key_path_component),
    )),

    _key_path_component: $ => choice(
      seq('.', $._member_name),
      seq('.', alias(token.immediate(/[0-9]+/), $.integer_literal)),
      alias($._immediate_quest, '?'),
      alias($._immediate_bang, '!'),
      seq(token.immediate('['), commaSep1($.value_argument), ']'),
      seq('.', token.immediate('['), commaSep1($.value_argument), ']'),
      // `\.!`, `\.?`
      seq('.', choice(alias($._immediate_bang, '!'), alias($._immediate_quest, '?'))),
    ),

    macro_expansion_expression: $ => prec.right(seq(
      field('name', $.macro_name),
      optional(field('type_arguments', $.type_arguments)),
      optional(field('arguments', $.value_arguments)),
      optional(field('trailing_closures', $.trailing_closures)),
    )),

    macro_name: _ => new RegExp('#[\\p{L}_][\\p{L}\\p{Nd}_]*'),

    selector_expression: $ => seq(
      choice('#selector', '#keyPath'),
      '(',
      optional(choice('getter:', 'setter:')),
      $._expression,
      ')',
    ),

    // ------------------------------------------------------------------
    // Patterns
    // ------------------------------------------------------------------

    _pattern: $ => choice(
      // An expression pattern never swallows the `=` of `case pattern = value`.
      prec.left(PREC.ASSIGN, $._expression),
      $.value_binding_pattern,
      $.tuple_pattern,
      $.enum_case_pattern,
      $.optional_pattern,
      $.is_pattern,
    ),

    value_binding_pattern: $ => prec.right(seq(choice('let', 'var'), $._pattern)),

    tuple_pattern: $ => seq('(', optional(commaSep1($.tuple_pattern_item)), ')'),

    tuple_pattern_item: $ => seq(
      optional(seq(field('name', $._argument_label), ':')),
      $._pattern,
    ),

    enum_case_pattern: $ => prec.right(seq(
      '.',
      field('name', $._member_name),
      optional(field('arguments', $.tuple_pattern)),
    )),

    optional_pattern: $ => seq($._pattern, alias($._immediate_quest, '?')),

    is_pattern: $ => seq('is', $._type),

    _binding_pattern: $ => choice($.simple_identifier, $.wildcard, $.tuple_pattern),

    // ------------------------------------------------------------------
    // Types
    // ------------------------------------------------------------------

    _type: $ => choice(
      $.user_type,
      $.optional_type,
      $.implicitly_unwrapped_type,
      $.array_type,
      $.dictionary_type,
      $.tuple_type,
      $.function_type,
      $.protocol_composition_type,
      $.opaque_type,
      $.existential_type,
      $.suppressed_type,
      $.pack_expansion_type,
      $.pack_reference_type,
      $.attributed_type,
      $.metatype_type,
      $.editor_placeholder,
    ),

    // Xcode placeholders: `<#value#>`.
    editor_placeholder: _ => token(seq('<#', repeat(choice(/[^#]/, /#[^>]/)), '#>')),

    user_type: $ => prec.right(seq(
      // `[Element].Iterator`, `[K: V].Index`
      optional(seq(field('base', choice($.array_type, $.dictionary_type)), '.')),
      sep1($._simple_user_type, '.'),
    )),

    _simple_user_type: $ => prec.right(seq(
      alias($.simple_identifier, $.type_identifier),
      optional($.type_arguments),
    )),

    type_arguments: $ => seq(
      token.immediate('<'),
      commaSep1($._type),
      '>',
    ),

    metatype_type: $ => prec(PREC.POSTFIX, seq($._type, '.', choice('Type', 'Protocol'))),

    optional_type: $ => prec(PREC.POSTFIX, seq($._type, alias($._immediate_quest, '?'))),

    implicitly_unwrapped_type: $ => prec(PREC.POSTFIX, seq($._type, alias($._immediate_bang, '!'))),

    array_type: $ => seq('[', field('element', $._type), ']'),

    dictionary_type: $ => seq('[', field('key', $._type), ':', field('value', $._type), ']'),

    tuple_type: $ => seq('(', optional(seq(commaSep1($.tuple_type_element), optional(','))), ')'),

    tuple_type_element: $ => seq(
      optional(seq(
        optional(field('external_name', choice($.simple_identifier, $.wildcard))),
        field('name', choice($.simple_identifier, $.wildcard)),
        ':',
      )),
      repeat($.parameter_modifier),
      field('type', $._type),
      optional('...'),
      // Default values of enum associated values.
      optional(seq('=', field('default_value', $._expression))),
    ),

    function_type: $ => prec.right(PREC.TYPE_FUNCTION, seq(
      field('parameters', $.tuple_type),
      optional('async'),
      optional($.throws_clause),
      '->',
      optional('sending'),
      field('return_type', $._type),
    )),

    protocol_composition_type: $ => prec.left(PREC.TYPE_COMPOSITION, seq($._type, '&', $._type)),

    opaque_type: $ => prec.right(seq('some', $._type)),

    existential_type: $ => prec.right(seq('any', $._type)),

    suppressed_type: $ => seq('~', $.user_type),

    pack_expansion_type: $ => prec.right(seq('repeat', $._type)),

    pack_reference_type: $ => prec.right(seq('each', $._type)),

    attributed_type: $ => prec.right(seq($.attribute, $._type)),

    type_annotation: $ => seq(':', repeat($.parameter_modifier), field('type', $._type)),

    throws_clause: $ => choice(
      seq('throws', optional(seq(token.immediate('('), field('error_type', $._type), ')'))),
      'rethrows',
    ),

    // ------------------------------------------------------------------
    // Declarations
    // ------------------------------------------------------------------

    _declaration: $ => choice(
      $.import_declaration,
      $.property_declaration,
      $.typealias_declaration,
      $.function_declaration,
      $.init_declaration,
      $.deinit_declaration,
      $.subscript_declaration,
      $.class_declaration,
      $.struct_declaration,
      $.actor_declaration,
      $.enum_declaration,
      $.extension_declaration,
      $.protocol_declaration,
      $.associatedtype_declaration,
      $.operator_declaration,
      $.precedence_group_declaration,
      $.macro_declaration,
    ),

    modifiers: $ => repeat1(choice(
      $.attribute,
      $.modifier,
      alias($._attribute_if_directive, $.if_directive),
    )),

    modifier: _ => choice(
      ...MODIFIERS,
      seq(
        choice('public', 'private', 'fileprivate', 'internal', 'open', 'package'),
        '(', 'set', ')',
      ),
      seq('nonisolated', '(', 'unsafe', ')'),
      seq('unowned', optional(seq('(', choice('safe', 'unsafe'), ')'))),
    ),

    parameter_modifier: _ => choice('inout', 'borrowing', 'consuming', '__owned', '__shared', 'sending', 'isolated'),

    attribute: $ => prec.right(seq(
      '@',
      field('name', $.user_type),
      optional(seq(
        token.immediate('('),
        optional(commaSep1($.attribute_argument)),
        ')',
      )),
    )),

    attribute_argument: $ => choice(
      seq(field('name', $._argument_label), ':', field('value', choice(
        $._expression,
        $._keyword_value,
        $._init_reference,
        // `@backDeployed(before: macOS 14)`
        $._platform_version,
      ))),
      $._expression,
      $._keyword_value,
      $.where_clause,
      $._platform_version,
      '*',
      repeat1(seq($._argument_label, ':')),
    ),

    // Keywords used as plain values in attributes: `@_documentation(visibility: internal)`,
    // `@attached(extension)`, `named(init)`.
    _keyword_value: $ => alias(
      choice(...MEMBER_KEYWORDS.filter(word => !['self', 'super', 'nil', 'true', 'false', 'init'].includes(word))),
      $.simple_identifier,
    ),

    import_declaration: $ => seq(
      optional($.modifiers),
      'import',
      optional(choice('typealias', 'struct', 'class', 'enum', 'protocol', 'let', 'var', 'func')),
      field('name', $.identifier),
    ),

    identifier: $ => prec.right(sep1($.simple_identifier, '.')),

    property_declaration: $ => seq(
      optional($.modifiers),
      choice('let', 'var'),
      commaSep1($.property_binding),
    ),

    property_binding: $ => prec.right(seq(
      field('name', $._binding_pattern),
      optional($.type_annotation),
      choice(
        // Stored property, optionally with `willSet`/`didSet` observers.
        seq('=', field('value', $._expression_or_branch), optional(field('accessors', $.accessor_block))),
        // Computed property.
        optional(field('accessors', choice($.accessor_block, $.code_block))),
      ),
    )),

    accessor_block: $ => seq('{', repeat1($.accessor), '}'),

    accessor: $ => seq(
      repeat(choice($.attribute, $.modifier)),
      field('kind', choice(
        'get', 'set', 'willSet', 'didSet', '_modify', '_read', 'modify', 'read', 'init',
        'unsafeAddress', 'unsafeMutableAddress',
      )),
      optional(seq('(', field('parameter', $.simple_identifier), ')')),
      optional('async'),
      optional($.throws_clause),
      optional(field('body', $.code_block)),
    ),

    typealias_declaration: $ => seq(
      optional($.modifiers),
      'typealias',
      field('name', alias($.simple_identifier, $.type_identifier)),
      optional($.type_parameters),
      '=',
      field('value', $._type),
      optional($.where_clause),
    ),

    function_declaration: $ => prec.right(seq(
      optional($.modifiers),
      'func',
      field('name', choice(
        $.simple_identifier,
        alias($._operator_name, $.custom_operator),
      )),
      optional($.type_parameters),
      field('parameters', $.parameter_clause),
      optional('async'),
      optional($.throws_clause),
      optional(seq('->', optional('sending'), field('return_type', $._type))),
      optional($.where_clause),
      optional(field('body', $.code_block)),
    )),

    // An operator name stops before a `<` that opens generic parameters: `func ??<T>`.
    _operator_name: $ => choice(
      token(choice(
        new RegExp(`[${OPERATOR_CHARS}]*[${OPERATOR_CHARS.replace('<', '')}]`),
        new RegExp(`\\.[${OPERATOR_CHARS}.]*[${OPERATOR_CHARS.replace('<', '')}.]`),
      )),
      ...ALL_BINARY_OPERATORS,
      '!', '~', '=', '?', '.<',
    ),

    parameter_clause: $ => seq('(', optional(seq(commaSep1($.parameter), optional(','))), ')'),

    parameter: $ => seq(
      repeat($.attribute),
      optional(field('external_name', choice($._argument_label, $.wildcard))),
      field('name', choice($.simple_identifier, $.wildcard)),
      ':',
      repeat($.parameter_modifier),
      field('type', $._type),
      optional('...'),
      optional(seq('=', field('default_value', $._expression))),
    ),

    init_declaration: $ => prec.right(seq(
      optional($.modifiers),
      'init',
      optional(choice(alias($._immediate_quest, '?'), alias($._immediate_bang, '!'))),
      optional($.type_parameters),
      field('parameters', $.parameter_clause),
      optional('async'),
      optional($.throws_clause),
      optional($.where_clause),
      optional(field('body', $.code_block)),
    )),

    deinit_declaration: $ => seq(
      optional($.modifiers),
      'deinit',
      field('body', $.code_block),
    ),

    subscript_declaration: $ => prec.right(seq(
      optional($.modifiers),
      'subscript',
      optional($.type_parameters),
      field('parameters', $.parameter_clause),
      '->',
      optional('sending'),
      field('return_type', $._type),
      optional($.where_clause),
      optional(field('accessors', choice($.accessor_block, $.code_block))),
    )),

    class_declaration: $ => typeDeclaration($, 'class', $.class_body),
    struct_declaration: $ => typeDeclaration($, 'struct', $.class_body),
    actor_declaration: $ => typeDeclaration($, 'actor', $.class_body),
    enum_declaration: $ => typeDeclaration($, 'enum', $.enum_body),

    protocol_declaration: $ => seq(
      optional($.modifiers),
      'protocol',
      field('name', alias($.simple_identifier, $.type_identifier)),
      optional($.primary_associated_types),
      optional($.inheritance_clause),
      optional($.where_clause),
      field('body', $.class_body),
    ),

    primary_associated_types: $ => seq(
      token.immediate('<'),
      commaSep1(alias($.simple_identifier, $.type_identifier)),
      '>',
    ),

    extension_declaration: $ => seq(
      optional($.modifiers),
      'extension',
      field('name', $._type),
      optional($.inheritance_clause),
      optional($.where_clause),
      field('body', $.class_body),
    ),

    class_body: $ => seq('{', optional($._members), '}'),

    enum_body: $ => seq('{', optional($._members), '}'),

    _members: $ => repeat1(seq($._member, optional($._semi))),

    _member: $ => choice(
      $._declaration,
      $.enum_case_declaration,
      alias($._member_if_directive, $.if_directive),
      $.macro_expansion_expression,
    ),

    enum_case_declaration: $ => seq(
      optional($.modifiers),
      'case',
      commaSep1($.enum_case_element),
    ),

    enum_case_element: $ => seq(
      field('name', $.simple_identifier),
      optional(field('associated_values', $.tuple_type)),
      optional(seq('=', field('raw_value', $._expression))),
    ),

    associatedtype_declaration: $ => seq(
      optional($.modifiers),
      'associatedtype',
      field('name', alias($.simple_identifier, $.type_identifier)),
      optional($.inheritance_clause),
      optional(seq('=', field('default', $._type))),
      optional($.where_clause),
    ),

    inheritance_clause: $ => seq(':', commaSep1($._type)),

    type_parameters: $ => seq(
      '<',
      commaSep1($.type_parameter),
      optional($.where_clause),
      '>',
    ),

    type_parameter: $ => seq(
      repeat($.attribute),
      optional('each'),
      field('name', alias($.simple_identifier, $.type_identifier)),
      optional(seq(':', field('constraint', $._type))),
    ),

    where_clause: $ => prec.left(seq('where', commaSep1($.type_requirement))),

    type_requirement: $ => seq(
      field('left', $._type),
      choice(':', '=='),
      field('right', $._type),
    ),

    operator_declaration: $ => seq(
      choice('prefix', 'postfix', 'infix'),
      'operator',
      // No generic parameters follow, so names ending in `<` (`.<`) are fine.
      field('name', choice($.custom_operator, alias($._operator_name, $.custom_operator))),
      optional(seq(':', field('precedence_group', $.simple_identifier))),
    ),

    precedence_group_declaration: $ => seq(
      'precedencegroup',
      field('name', $.simple_identifier),
      '{',
      repeat($.precedence_group_attribute),
      '}',
    ),

    precedence_group_attribute: $ => seq(
      field('name', choice('higherThan', 'lowerThan', 'associativity', 'assignment')),
      ':',
      field('value', choice(
        commaSep1($.simple_identifier),
        $.boolean_literal,
      )),
    ),

    macro_declaration: $ => seq(
      optional($.modifiers),
      'macro',
      field('name', $.simple_identifier),
      optional($.type_parameters),
      field('parameters', $.parameter_clause),
      optional(seq('->', optional('sending'), field('return_type', $._type))),
      optional(seq('=', field('definition', $._expression))),
      optional($.where_clause),
    ),
  },
});

/**
 * A `#if` block whose branches contain `content`.
 *
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral} content
 */
function directive($, content) {
  return seq(
    '#if',
    field('condition', $._directive_condition),
    optional($._semi),
    content,
    repeat(seq('#elseif', field('condition', $._directive_condition), optional($._semi), content)),
    optional(seq('#else', content)),
    '#endif',
  );
}

/**
 * Shared shape of class, struct, actor and enum declarations.
 *
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral} keyword
 * @param {RuleOrLiteral} body
 */
function typeDeclaration($, keyword, body) {
  return seq(
    optional($.modifiers),
    keyword,
    field('name', $._declared_type_name),
    optional($.type_parameters),
    optional($.inheritance_clause),
    optional($.where_clause),
    field('body', body),
  );
}

/**
 * @param {RuleOrLiteral} rule
 * @param {RuleOrLiteral} separator
 */
function sep1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

/** @param {RuleOrLiteral} rule */
function commaSep1(rule) {
  return sep1(rule, ',');
}
