import assert from "node:assert";
import { test } from "node:test";
import Parser from "tree-sitter";

test("can load grammar", async () => {
  const parser = new Parser();
  await assert.doesNotReject(async () => {
    const { default: language } = await import("./index.js");
    parser.setLanguage(language);
  });
});

test("parses Swift source without errors", async () => {
  const { default: language } = await import("./index.js");
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse("let greeting = \"Hello, \\(name)!\"\n");
  assert.strictEqual(tree.rootNode.hasError, false);
  assert.strictEqual(tree.rootNode.firstChild.type, "property_declaration");
});
