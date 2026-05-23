#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODESPACES_DIR="${ROOT_DIR}/.codespaces"
LOG_DIR="${CODESPACES_DIR}/logs"
URL_FILE="${CODESPACES_DIR}/preview-url.txt"
TUNNEL_LOG="${LOG_DIR}/preview-tunnel.log"

git -C "${ROOT_DIR}" status -sb | sed -n '1p'

port_state() {
  local port="$1"
  local label="$2"

  if ss -lnt | awk '{print $4}' | grep -Eq ":${port}$"; then
    echo "${label}: listening on ${port}"
  else
    echo "${label}: not listening on ${port}"
  fi
}

port_state 5173 "Dev server"
port_state 4173 "Static preview"

tunnel_running="false"
if pgrep -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:4173" >/dev/null 2>&1; then
  tunnel_running="true"
  echo "Tunnel: running for preview port 4173"
else
  echo "Tunnel: not running"
fi

if [[ -f "${URL_FILE}" ]]; then
  echo "Share URL: $(cat "${URL_FILE}")"
  if [[ "${tunnel_running}" != "true" ]]; then
    echo "Share URL state: cached only (tunnel is currently down)"
  fi
elif [[ -f "${TUNNEL_LOG}" ]]; then
  url="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "${TUNNEL_LOG}" | tail -n1 || true)"
  if [[ -n "${url}" ]]; then
    echo "Share URL: ${url}"
    if [[ "${tunnel_running}" != "true" ]]; then
      echo "Share URL state: from logs only (tunnel is currently down)"
    fi
  else
    echo "Share URL: unavailable (tunnel log has no URL yet)"
  fi
else
  echo "Share URL: unavailable"
fi
