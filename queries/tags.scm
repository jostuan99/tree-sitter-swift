(class_declaration
  name: (type_identifier) @name) @definition.class

(struct_declaration
  name: (type_identifier) @name) @definition.class

(actor_declaration
  name: (type_identifier) @name) @definition.class

(enum_declaration
  name: (type_identifier) @name) @definition.class

(protocol_declaration
  name: (type_identifier) @name) @definition.interface

(extension_declaration
  name: (user_type
    (type_identifier) @name)) @reference.implementation

(typealias_declaration
  name: (type_identifier) @name) @definition.type

(associatedtype_declaration
  name: (type_identifier) @name) @definition.type

(function_declaration
  name: (simple_identifier) @name) @definition.function

(init_declaration
  "init" @name) @definition.method

(macro_declaration
  name: (simple_identifier) @name) @definition.macro

(enum_case_element
  name: (simple_identifier) @name) @definition.constant

(class_body
  (property_declaration
    (property_binding
      name: (simple_identifier) @name)) @definition.field)

(call_expression
  function: (simple_identifier) @name) @reference.call

(call_expression
  function: (navigation_expression
    member: (simple_identifier) @name)) @reference.call

(inheritance_clause
  (user_type
    (type_identifier) @name)) @reference.implementation
