from unittest import TestCase

from tree_sitter import Language, Parser
import tree_sitter_swift


class TestLanguage(TestCase):
    def test_can_load_grammar(self):
        try:
            Parser(Language(tree_sitter_swift.language()))
        except Exception:
            self.fail("Error loading Swift grammar")

    def test_parses_swift_source(self):
        parser = Parser(Language(tree_sitter_swift.language()))
        tree = parser.parse(b'let greeting = "Hello, \\(name)!"\n')
        self.assertFalse(tree.root_node.has_error)
        self.assertEqual(tree.root_node.child(0).type, "property_declaration")
