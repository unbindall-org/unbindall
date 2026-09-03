#!/usr/bin/env bash
set -Eeuo pipefail

project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_dir"

env_file="${1:-.env.docker}"
attempt_log=""

cleanup() {
  if [[ -n "$attempt_log" ]]; then
    rm -f "$attempt_log"
  fi
}
trap cleanup EXIT

if [[ ! -f "$env_file" ]]; then
  echo "Environment file '$env_file' not found." >&2
  echo "Create it first: cp .env.docker.example .env.docker" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker with Docker Compose v2 is required." >&2
  exit 1
fi

start_port="$({ docker compose --env-file "$env_file" config --environment \
  | sed -n 's/^APP_PORT=//p'; } | tail -n 1)"
start_port="${start_port:-3000}"

if [[ ! "$start_port" =~ ^[0-9]+$ ]] || (( start_port < 1 || start_port > 65535 )); then
  echo "APP_PORT must be a number between 1 and 65535 (received '$start_port')." >&2
  exit 1
fi

existing_port="$(
  docker compose --env-file "$env_file" port app 3000 2>/dev/null \
    | sed -n 's/.*://p' \
    | tail -n 1 \
    || true
)"

port_is_busy() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi

  if command -v ss >/dev/null 2>&1; then
    ss -H -ltn "sport = :$port" 2>/dev/null | grep -q .
    return
  fi

  (exec 3<>"/dev/tcp/127.0.0.1/$port") >/dev/null 2>&1
}

port="$start_port"
while (( port <= 65535 )); do
  if [[ "$port" != "$existing_port" ]] && port_is_busy "$port"; then
    echo "Port $port is already in use; trying $((port + 1))."
    ((port += 1))
    continue
  fi

  attempt_log="$(mktemp)"
  if APP_PORT="$port" AUTH_URL="http://localhost:$port" \
    docker compose --env-file "$env_file" up --build --wait 2>&1 | tee "$attempt_log"; then
    rm -f "$attempt_log"
    attempt_log=""
    echo
    echo "Unbindall is ready at: http://localhost:$port"
    exit 0
  else
    compose_status="${PIPESTATUS[0]}"
  fi

  if grep -Eqi \
    'failed to bind host port.*address already in use|bind for .* failed: port is already allocated|port is already allocated' \
    "$attempt_log"; then
    rm -f "$attempt_log"
    attempt_log=""
    echo "Port $port became unavailable; trying $((port + 1))."
    ((port += 1))
    existing_port=""
    continue
  fi

  rm -f "$attempt_log"
  attempt_log=""
  exit "$compose_status"
done

echo "No free local port is available between $start_port and 65535." >&2
exit 1
