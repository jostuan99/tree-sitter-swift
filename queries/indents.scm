[
  (class_body)
  (enum_body)
  (code_block)
  (closure_expression)
  (accessor_block)
  (value_arguments)
  (parameter_clause)
  (array_literal)
  (dictionary_literal)
  (tuple_expression)
  (capture_list)
  (type_parameters)
  (precedence_group_declaration)
] @indent.begin

(switch_statement
  "{" @indent.begin)

(switch_case) @indent.begin

[
  "}"
  ")"
  "]"
] @indent.end @indent.branch

(switch_case
  [
    "case"
    (default_keyword)
  ] @indent.branch)

[
  (comment)
  (multiline_comment)
  (multi_line_string_literal)
  (raw_string_literal)
] @indent.auto

(if_directive
  [
    "#if"
    "#elseif"
    "#else"
    "#endif"
  ] @indent.zero)
