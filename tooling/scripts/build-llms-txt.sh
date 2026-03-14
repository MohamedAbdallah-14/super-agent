#!/bin/bash
# Build llms-full.txt by concatenating all documentation files
# Usage: bash tooling/scripts/build-llms-txt.sh

set -euo pipefail

OUTPUT="llms-full.txt"
DOCS_DIR="docs"

echo "# SuperAgent — Complete Documentation" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "> Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Concatenate in logical order: concepts → getting-started → guides → reference
for section in concepts getting-started guides reference; do
  dir="$DOCS_DIR/$section"
  if [ -d "$dir" ]; then
    for file in "$dir"/*.md; do
      if [ -f "$file" ]; then
        # Skip stubs
        if grep -q "status: stub" "$file" 2>/dev/null; then
          continue
        fi
        echo "---" >> "$OUTPUT"
        echo "## Source: $file" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
        cat "$file" >> "$OUTPUT"
        echo "" >> "$OUTPUT"
      fi
    done
  fi
done

# Add root docs
for file in README.md CONTRIBUTING.md AGENTS.md; do
  if [ -f "$file" ]; then
    echo "---" >> "$OUTPUT"
    echo "## Source: $file" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
    cat "$file" >> "$OUTPUT"
    echo "" >> "$OUTPUT"
  fi
done

SIZE=$(wc -c < "$OUTPUT")
echo "Built $OUTPUT ($(( SIZE / 1024 )) KB)"
