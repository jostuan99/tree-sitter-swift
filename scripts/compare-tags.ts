// Compares the declarations found by tree-sitter (queries/tags.scm) with the
// ones found by swift-syntax, the reference Swift parser.
//
// A declaration is identified by file, kind, name and line. Differences point
// at trees that are wrong even when they contain no ERROR node.
//
// Usage:
//   node scripts/compare-tags.ts [--min-percent N] [--show N] <file list>
//
// The file list holds one Swift file path per line. Build the swift-syntax
// tool first: `swift build -c release --package-path scripts/compare-swift-syntax`.

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Parser from "tree-sitter";
import Swift from "../bindings/node/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tool = join(root, "scripts/compare-swift-syntax/.build/release/swift-syntax-decls");

let minPercent: number | undefined;
let show = 20;
let listPath: string | undefined;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--min-percent") minPercent = Number(args[++i]);
  else if (args[i] === "--show") show = Number(args[++i]);
  else listPath = args[i];
}
if (!listPath) {
  console.error("usage: node scripts/compare-tags.ts [--min-percent N] [--show N] <file list>");
  process.exit(2);
}

const files = readFileSync(listPath, "utf8")
  .split("\n")
  .filter((line) => line.length > 0 && statSync(line, { throwIfNoEntry: false })?.isFile());

// Reference declarations from swift-syntax.
const reference = new Set(
  execFileSync(tool, [], { input: files.join("\n"), maxBuffer: 1 << 30, encoding: "utf8" })
    .split("\n")
    .filter((line) => line.length > 0),
);

// Declarations from tree-sitter.
const language = Swift as Parser.Language;
const parser = new Parser();
parser.setLanguage(language);
const query = new Parser.Query(language, readFileSync(join(root, "queries/tags.scm"), "utf8"));
const found = new Set<string>();

for (const file of files) {
  const tree = parser.parse(readFileSync(file, "utf8"), undefined, { bufferSize: 1 << 24 });
  for (const match of query.matches(tree.rootNode)) {
    const name = match.captures.find((capture) => capture.name === "name");
    const definition = match.captures.find((capture) => capture.name.startsWith("definition."));
    if (!name || !definition) continue;
    const kind = definition.name.slice("definition.".length);
    // Properties are tagged by tree-sitter only; swift-syntax output has no `field`.
    if (kind === "field") continue;
    found.add(`${file}\t${kind}\t${name.node.text}\t${name.node.startPosition.row + 1}`);
  }
}

const missing = [...reference].filter((entry) => !found.has(entry));
const extra = [...found].filter((entry) => !reference.has(entry));
const matched = reference.size - missing.length;
const recall = reference.size === 0 ? 100 : (100 * matched) / reference.size;
const precision = found.size === 0 ? 100 : (100 * matched) / found.size;

const describe = (entry: string) => {
  const [file, kind, name, line] = entry.split("\t");
  return `  ${file}:${line} ${kind} ${name}`;
};

if (missing.length > 0) {
  console.log(`Missing in tree-sitter (${missing.length}):`);
  missing.slice(0, show).forEach((entry) => console.log(describe(entry)));
}
if (extra.length > 0) {
  console.log(`Only in tree-sitter (${extra.length}):`);
  extra.slice(0, show).forEach((entry) => console.log(describe(entry)));
}

console.log(
  `Files: ${files.length}; swift-syntax declarations: ${reference.size}; ` +
    `tree-sitter declarations: ${found.size}; recall: ${recall.toFixed(2)}%; precision: ${precision.toFixed(2)}%`,
);

if (minPercent !== undefined && Math.min(recall, precision) < minPercent) {
  console.error(`Agreement is below the required ${minPercent}%`);
  process.exit(1);
}
