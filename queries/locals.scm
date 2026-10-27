; Scopes
; ------

[
  (source_file)
  (code_block)
  (closure_expression)
  (function_declaration)
  (init_declaration)
  (subscript_declaration)
  (for_statement)
  (catch_block)
  (switch_case)
  (class_body)
  (enum_body)
] @local.scope

; Definitions
; -----------

(parameter
  name: (simple_identifier) @local.definition)

(closure_parameter
  name: (simple_identifier) @local.definition)

(closure_parameters
  (closure_parameter
    (simple_identifier) @local.definition))

(property_binding
  name: (simple_identifier) @local.definition)

(property_binding
  name: (tuple_pattern
    (tuple_pattern_item
      (simple_identifier) @local.definition)))

(optional_binding_condition
  name: (simple_identifier) @local.definition)

(value_binding_pattern
  (simple_identifier) @local.definition)

(for_statement
  pattern: (simple_identifier) @local.definition)

(capture_list_item
  (simple_identifier) @local.definition .)

(function_declaration
  name: (simple_identifier) @local.definition)

(type_parameter
  name: (type_identifier) @local.definition)

; References
; ----------

(simple_identifier) @local.reference
