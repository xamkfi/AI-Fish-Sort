#!/usr/bin/env bash
# Rebuilds the app image from current code and restarts the app container.
# Ensures MySQL is up first so the app can connect on boot.
# Usage:
#   ./rebuild.sh
set -euo pipefail
cd "$(dirname "$0")"

podman rm -f ai-fish-sort-api 2>/dev/null || true
podman build -t ai-fish-sort-api .

# start.sh recreates the removed app container from the fresh image
exec ./start.sh
