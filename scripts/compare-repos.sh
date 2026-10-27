#!/usr/bin/env bash
# Compares the declarations found by tree-sitter with the ones found by
# swift-syntax in every Swift file under test/repos (see scripts/parse-repos.sh).
#
# Usage: scripts/compare-repos.sh [--min-percent N] [--show N]
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

swift build -c release --package-path scripts/compare-swift-syntax

file_list="$(mktemp)"
trap 'rm -f "$file_list"' EXIT
find test/repos -name '*.swift' -type f > "$file_list"

node scripts/compare-tags.ts "$@" "$file_list"
