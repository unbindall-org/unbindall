#!/usr/bin/env bash
# Local development Redis for the worker / queues.
#
# Prefers a natively installed `redis-server` (durable data kept in the
# repo-local .redis-dev/ dir, survives reboots, no Docker daemon needed) and
# falls back to a throwaway Docker container when redis-server isn't installed.
#
# Subcommands:
#   start    bring Redis up (native, else Docker); no-op if already reachable
#   stop     stop whatever this script started (native pid or Docker container)
#   ensure   idempotent "make sure Redis is reachable" — used by dev scripts
#   status   print whether Redis is reachable and how it's being served
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HOST_PORT="${REDIS_DEV_PORT:-6379}"
REDIS_URL="redis://127.0.0.1:${HOST_PORT}"

DATA_DIR="$ROOT/.redis-dev"
PID_FILE="$DATA_DIR/redis.pid"
LOG_FILE="$DATA_DIR/redis.log"

CONTAINER_NAME="kalendium-redis-dev"
REDIS_IMAGE="redis:7-alpine"

usage() {
  echo "Usage: $0 {start|stop|ensure|status}" >&2
  exit 1
}

# Reachability check with no dependency on redis-cli: speak just enough RESP
# over a bare TCP socket to send PING and look for +PONG.
redis_reachable() {
  # Brace group so the 2>/dev/null is in effect *before* the /dev/tcp open is
  # attempted — otherwise bash prints "connection refused" before suppressing.
  { exec 3<>"/dev/tcp/127.0.0.1/${HOST_PORT}"; } 2>/dev/null || return 1
  printf 'PING\r\n' >&3 2>/dev/null || { exec 3>&- 3<&- 2>/dev/null || true; return 1; }
  local reply=""
  read -r -t 2 reply <&3 2>/dev/null || true
  exec 3>&- 3<&- 2>/dev/null || true
  [[ "$reply" == +PONG* ]]
}

wait_until_reachable() {
  for _ in $(seq 1 50); do
    redis_reachable && return 0
    sleep 0.1
  done
  return 1
}

native_available() { command -v redis-server >/dev/null 2>&1; }
docker_available() { command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; }

native_running() {
  [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE" 2>/dev/null)" 2>/dev/null
}

docker_container_exists() {
  command -v docker >/dev/null 2>&1 &&
    docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER_NAME"
}

start_native() {
  mkdir -p "$DATA_DIR"
  # --appendonly yes gives durable, on-disk persistence between dev sessions.
  redis-server \
    --port "$HOST_PORT" \
    --bind 127.0.0.1 \
    --daemonize yes \
    --dir "$DATA_DIR" \
    --pidfile "$PID_FILE" \
    --logfile "$LOG_FILE" \
    --appendonly yes
  if ! wait_until_reachable; then
    echo "redis-server did not become reachable; see $LOG_FILE" >&2
    exit 1
  fi
  echo "Started native redis-server (data: $DATA_DIR)"
}

start_docker() {
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    docker start "$CONTAINER_NAME" >/dev/null
    echo "Started existing Docker container: $CONTAINER_NAME"
  else
    docker run -d \
      --name "$CONTAINER_NAME" \
      -p "${HOST_PORT}:6379" \
      "$REDIS_IMAGE" >/dev/null
    echo "Created and started Docker container: $CONTAINER_NAME"
  fi
  if ! wait_until_reachable; then
    echo "Docker Redis did not become reachable on :${HOST_PORT}" >&2
    exit 1
  fi
}

start_redis() {
  if redis_reachable; then
    echo "Redis already reachable at $REDIS_URL"
  elif native_available; then
    start_native
  elif docker_available; then
    start_docker
  else
    cat >&2 <<EOF
No way to start Redis: neither redis-server nor a running Docker daemon found.

Install Redis natively (recommended):
  Fedora/RHEL  : sudo dnf install redis
  Debian/Ubuntu: sudo apt install redis-server
  macOS        : brew install redis

…or start Docker and rerun this command.
EOF
    exit 1
  fi
  echo
  echo "REDIS_URL=$REDIS_URL"
}

stop_redis() {
  local stopped=0

  if native_running; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
    echo "Stopped native redis-server (pid $pid)"
    stopped=1
  elif [[ -f "$PID_FILE" ]]; then
    rm -f "$PID_FILE"
  fi

  if docker_container_exists; then
    docker stop "$CONTAINER_NAME" >/dev/null
    echo "Stopped Docker container: $CONTAINER_NAME"
    stopped=1
  fi

  [[ "$stopped" -eq 0 ]] && echo "No dev Redis was running"
  return 0
}

status_redis() {
  if redis_reachable; then
    local how="external/unknown"
    native_running && how="native redis-server"
    docker_container_exists && how="Docker ($CONTAINER_NAME)"
    echo "Redis reachable at $REDIS_URL (via $how)"
  else
    echo "Redis NOT reachable at $REDIS_URL"
    exit 1
  fi
}

case "${1:-}" in
  start | ensure) start_redis ;;
  stop) stop_redis ;;
  status) status_redis ;;
  *) usage ;;
esac
