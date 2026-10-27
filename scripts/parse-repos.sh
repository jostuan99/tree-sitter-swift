#!/usr/bin/env bash
# Clones the reference repositories listed in scripts/repos.txt and reports how
# many Swift files parse without ERROR or MISSING nodes.
#
# Usage: scripts/parse-repos.sh [--min-percent N]
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
repos_dir="$root/test/repos"
min_percent=""

if [[ "${1:-}" == "--min-percent" ]]; then
  min_percent="$2"
fi

mkdir -p "$repos_dir"
file_list="$(mktemp)"
trap 'rm -f "$file_list"' EXIT

while read -r url ref subdir; do
  [[ -z "$url" || "$url" == \#* ]] && continue
  name="$(basename "$url" .git)"
  dest="$repos_dir/$name"
  if [[ ! -d "$dest" ]]; then
    # Sparse checkout keeps large repositories (swiftlang/swift) cheap to clone.
    git clone --quiet --depth 1 --filter=blob:none --sparse --branch "$ref" "$url" "$dest"
    git -C "$dest" sparse-checkout set ${subdir:+"$subdir"}
  fi
  find "$dest/${subdir:-}" -name '*.swift' -print0 >> "$file_list"
done < "$root/scripts/repos.txt"

cd "$root"
output="$(xargs -0 npx tree-sitter parse --quiet --stat < "$file_list" || true)"

echo "$output" | grep -E 'ERROR|MISSING' | sed -E 's/[[:space:]]+Parse:.*\((ERROR|MISSING)/ \1/' | head -n 50 || true
summary="$(echo "$output" | tail -n 1)"
echo "$summary"

if [[ -n "$min_percent" ]]; then
  percent="$(echo "$summary" | sed -E 's/.*success percentage: ([0-9.]+)%.*/\1/')"
  if awk "BEGIN { exit !($percent < $min_percent) }"; then
    echo "Success percentage $percent% is below the required $min_percent%" >&2
    exit 1
  fi
fi
