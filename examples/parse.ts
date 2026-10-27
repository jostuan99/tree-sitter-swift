// Parses a Swift file (or a built-in sample) and prints the syntax tree and
// the declared functions.
//
// Usage: node examples/parse.ts [path/to/File.swift]

import { readFileSync } from "node:fs";
import Parser from "tree-sitter";
import Swift from "../bindings/node/index.js";

const sample = `
struct Greeter {
  let name: String

  func greet() -> String {
    "Hello, \\(name)!"
  }
}
`;

const path = process.argv[2];
const source = path ? readFileSync(path, "utf8") : sample;

const parser = new Parser();
parser.setLanguage(Swift as Parser.Language);
const tree = parser.parse(source);

console.log(tree.rootNode.toString());

const query = new Parser.Query(
  Swift as Parser.Language,
  "(function_declaration name: (simple_identifier) @name)",
);
for (const { node } of query.captures(tree.rootNode)) {
  console.log(`func ${node.text} at line ${node.startPosition.row + 1}`);
}
