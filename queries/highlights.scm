; Identifiers
; -----------
; When several patterns capture the same node, the last one wins.

(simple_identifier) @variable

(type_identifier) @type

((simple_identifier) @variable.builtin
  (#match? @variable.builtin "^\\$[0-9]+$"))

(self_expression) @variable.builtin
(super_expression) @variable.builtin

; Declarations
; ------------

(function_declaration
  name: (simple_identifier) @function)

(function_declaration
  name: (custom_operator) @operator)

(macro_declaration
  name: (simple_identifier) @function.macro)

(parameter
  external_name: (simple_identifier) @variable.parameter)

(parameter
  name: (simple_identifier) @variable.parameter)

(closure_parameter
  name: (simple_identifier) @variable.parameter)

(class_body
  (property_declaration
    (property_binding
      name: (simple_identifier) @variable.member)))

(enum_body
  (property_declaration
    (property_binding
      name: (simple_identifier) @variable.member)))

(enum_case_element
  name: (simple_identifier) @constant)

(type_parameter
  name: (type_identifier) @type.parameter)

(precedence_group_declaration
  name: (simple_identifier) @type)

(import_declaration
  name: (identifier
    (simple_identifier) @module))

; Expressions
; -----------
; Later patterns take priority, so generic member patterns come first.

(navigation_expression
  member: (simple_identifier) @variable.member)

(implicit_member_expression
  member: (simple_identifier) @variable.member)

(navigation_suffix
  member: (simple_identifier) @variable.member)

(call_expression
  function: (simple_identifier) @function.call)

(call_expression
  function: (navigation_expression
    member: (simple_identifier) @function.method.call))

(call_expression
  function: (implicit_member_expression
    member: (simple_identifier) @function.method.call))

((call_expression
  function: (simple_identifier) @type)
  (#match? @type "^[A-Z]"))

(value_argument
  name: (simple_identifier) @label)

(trailing_closures
  label: (simple_identifier) @label)

(function_reference_label
  (simple_identifier) @label)

(labeled_statement
  label: (simple_identifier) @label)

(break_statement
  label: (simple_identifier) @label)

(continue_statement
  label: (simple_identifier) @label)

(macro_name) @function.macro

(macro_expansion_expression
  name: (macro_name) @function.macro)

(attribute
  "@" @attribute
  name: (user_type
    (type_identifier) @attribute))

; Literals
; --------

[
  (line_string_literal)
  (multi_line_string_literal)
  (raw_string_literal)
] @string

(escape_sequence) @string.escape

(regex_literal) @string.regexp

(interpolation
  "\\(" @punctuation.special
  ")" @punctuation.special)

[
  (integer_literal)
  (hex_literal)
  (oct_literal)
  (bin_literal)
] @number

(real_literal) @number.float

(version_literal) @number

(boolean_literal) @boolean

(nil) @constant.builtin

; Comments
; --------

[
  (comment)
  (multiline_comment)
] @comment

((comment) @comment.documentation
  (#match? @comment.documentation "^///"))

((multiline_comment) @comment.documentation
  (#match? @comment.documentation "^/\\*\\*"))

(shebang_line) @keyword.directive

; Keywords
; --------

[
  "import"
] @keyword.import

[
  "func"
  "init"
  "deinit"
  "subscript"
] @keyword.function

[
  "class"
  "struct"
  "enum"
  "protocol"
  "extension"
  "actor"
  "typealias"
  "associatedtype"
  "operator"
  "precedencegroup"
  "macro"
] @keyword.type

[
  "let"
  "var"
  "case"
  "in"
  "where"
  "some"
  "any"
  "each"
  "inout"
  "get"
  "set"
  "willSet"
  "didSet"
  "_modify"
  "_read"
  "modify"
  "read"
  "unsafeAddress"
  "unsafeMutableAddress"
  "higherThan"
  "lowerThan"
  "associativity"
  "assignment"
  "consume"
  "copy"
  "discard"
] @keyword

[
  "public"
  "private"
  "fileprivate"
  "internal"
  "open"
  "package"
  "static"
  "final"
  "override"
  "mutating"
  "nonmutating"
  "convenience"
  "required"
  "lazy"
  "weak"
  "unowned"
  "dynamic"
  "optional"
  "indirect"
  "prefix"
  "postfix"
  "infix"
  "nonisolated"
  "isolated"
  "distributed"
  "consuming"
  "borrowing"
  "sending"
  "__consuming"
  "__owned"
  "__shared"
  "safe"
  "unsafe"
] @keyword.modifier

(modifier
  "class" @keyword.modifier)

[
  "if"
  "else"
  "guard"
  "switch"
  (default_keyword)
  "fallthrough"
] @keyword.conditional

[
  "for"
  "while"
  "repeat"
  "break"
  "continue"
] @keyword.repeat

[
  "return"
  "yield"
] @keyword.return

[
  "do"
  "catch"
  "throw"
  "throws"
  "rethrows"
  "try"
  "try?"
  "try!"
  "defer"
] @keyword.exception

[
  "async"
  "await"
] @keyword.coroutine

[
  "as"
  "as?"
  "as!"
  "is"
] @keyword.operator

[
  "#if"
  "#elseif"
  "#else"
  "#endif"
] @keyword.directive

[
  "#available"
  "#unavailable"
  "#selector"
  "#keyPath"
  "getter:"
  "setter:"
] @function.macro

[
  "Type"
  "Protocol"
] @type.builtin

; Operators and punctuation
; -------------------------

(custom_operator) @operator

(operator_reference) @operator

[
  "!" "?" "!=" "!==" "%" "%=" "&" "&&" "&*" "&*=" "&+" "&+=" "&-" "&-=" "&<<" "&="
  "&>>" "*" "*=" "+" "+=" "-" "-=" "->" "..." "..<" "/" "/=" "<" "<<" "<<=" "<="
  "=" "==" "===" ">" ">=" ">>" ">>=" "??" "^" "^=" "|" "|=" "||" "~" "~="
] @operator

(ternary_expression
  ["?" ":"] @keyword.conditional.ternary)

(key_path_expression
  "\\" @operator)

[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

(type_arguments
  ["<" ">"] @punctuation.bracket)

(type_parameters
  ["<" ">"] @punctuation.bracket)

[
  "."
  ","
  ":"
  ";"
] @punctuation.delimiter

(wildcard) @character.special

(editor_placeholder) @comment.note
