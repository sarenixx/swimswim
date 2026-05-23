#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CODESPACES_DIR="${ROOT_DIR}/.codespaces"
LOG_DIR="${CODESPACES_DIR}/logs"
PREVIEW_LOG="${LOG_DIR}/preview-serve.log"
TUNNEL_LOG="${LOG_DIR}/preview-tunnel.log"
URL_FILE="${CODESPACES_DIR}/preview-url.txt"
PREVIEW_PORT=4173

mkdir -p "${LOG_DIR}"

extract_url() {
  local log_file="$1"
  if [[ -f "${log_file}" ]]; then
    grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' "${log_file}" | tail -n1 || true
  fi
}

if [[ ! -f "${ROOT_DIR}/dist/index.html" ]]; then
  echo "No dist build found, running npm run build..."
  (
    cd "${ROOT_DIR}"
    npm run build
  )
fi

if ss -lnt | awk '{print $4}' | grep -Eq ":${PREVIEW_PORT}$"; then
  echo "Preview server already listening on ${PREVIEW_PORT}."
else
  echo "Starting static preview server on ${PREVIEW_PORT}..."
  (
    cd "${ROOT_DIR}"
    nohup npx --yes serve -s dist -l "${PREVIEW_PORT}" >"${PREVIEW_LOG}" 2>&1 &
  )
fi

if pgrep -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:${PREVIEW_PORT}" >/dev/null 2>&1; then
  url="$(extract_url "${TUNNEL_LOG}")"
  if [[ -n "${url}" ]]; then
    printf '%s\n' "${url}" >"${URL_FILE}"
    echo "Cloudflare tunnel already running for ${PREVIEW_PORT}."
    echo "Preview URL: ${url}"
    echo "Template URL: ${url}/template"
    exit 0
  fi

  echo "Cloudflare tunnel is running without a managed URL log. Restarting it under managed logs..."
  pkill -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:${PREVIEW_PORT}" || true
  sleep 1
fi

echo "Starting Cloudflare quick tunnel..."
url=""
for attempt in 1 2 3; do
  : >"${TUNNEL_LOG}"
  (
    cd "${ROOT_DIR}"
    nohup npx --yes cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:${PREVIEW_PORT}" >"${TUNNEL_LOG}" 2>&1 &
    tunnel_pid=$!
    echo "${tunnel_pid}" >"${LOG_DIR}/preview-tunnel.pid"
  )

  for _ in $(seq 1 30); do
    url="$(extract_url "${TUNNEL_LOG}")"
    if [[ -n "${url}" ]]; then
      if pgrep -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:${PREVIEW_PORT}" >/dev/null 2>&1; then
        break
      fi
      url=""
    fi
    sleep 1
  done

  if [[ -n "${url}" ]]; then
    break
  fi

  pkill -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:${PREVIEW_PORT}" || true
  if grep -q "500 Internal Server Error" "${TUNNEL_LOG}"; then
    echo "Quick tunnel attempt ${attempt} failed with 500. Retrying..."
  else
    echo "Quick tunnel attempt ${attempt} did not return a URL. Retrying..."
  fi
  sleep 2
done

if [[ -n "${url}" ]]; then
  printf '%s\n' "${url}" >"${URL_FILE}"
  echo "Preview URL: ${url}"
  echo "Template URL: ${url}/template"
else
  echo "Tunnel URL not ready yet. Check ${TUNNEL_LOG} for progress."
  exit 1
fi
