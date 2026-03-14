#!/bin/bash
# Record SuperAgent terminal demo
# Prerequisites: brew install asciinema && pip3 install agg
#
# Usage:
#   cd /path/to/superagent
#   bash assets/record-demo.sh
#
# Output: assets/demo.gif (should be under 5MB)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
cd "$REPO_DIR"

# Check prerequisites
if ! command -v asciinema &>/dev/null; then
  echo "Error: asciinema not found. Install with: brew install asciinema"
  exit 1
fi

if ! command -v agg &>/dev/null; then
  echo "Error: agg not found. Install with: pip3 install agg"
  exit 1
fi

echo "Recording demo..."
asciinema rec assets/demo.cast \
  --cols 100 \
  --rows 25 \
  --overwrite \
  -c "bash assets/demo-script.sh"

echo "Converting to GIF..."
agg assets/demo.cast assets/demo.gif \
  --cols 100 \
  --rows 25 \
  --speed 1.5

# Check file size
SIZE=$(stat -f%z assets/demo.gif 2>/dev/null || stat -c%s assets/demo.gif 2>/dev/null)
SIZE_MB=$((SIZE / 1024 / 1024))
echo "GIF size: ${SIZE_MB}MB"

if [ "$SIZE_MB" -gt 5 ]; then
  echo "Warning: GIF is over 5MB. Consider increasing --speed or trimming the demo."
fi

echo "Done. Output: assets/demo.gif"
echo "Embed in README.md with: ![SuperAgent Demo](assets/demo.gif)"
