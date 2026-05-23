#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT_DIR}/.codespaces/logs"
LOG_FILE="${LOG_DIR}/vite-dev.log"
PORT=5173

mkdir -p "${LOG_DIR}"

if ss -lnt | awk '{print $4}' | grep -Eq ":${PORT}$"; then
  echo "Port ${PORT} already has a listener. Skipping dev server start."
  exit 0
fi

if pgrep -f "vite.*--port ${PORT}" >/dev/null 2>&1; then
  echo "Detected Vite process for port ${PORT}. Skipping dev server start."
  exit 0
fi

cd "${ROOT_DIR}"
nohup npm run dev -- --port "${PORT}" >"${LOG_FILE}" 2>&1 &
echo "Started dev server on port ${PORT}. Logs: ${LOG_FILE}"
