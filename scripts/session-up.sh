#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "${ROOT_DIR}"
bash .devcontainer/post-attach.sh

if bash scripts/start-preview-share.sh; then
  echo "Share tunnel is active."
else
  echo "Share tunnel unavailable right now. Local servers are still available."
fi

bash scripts/session-status.sh
