#!/usr/bin/env bash
set -euo pipefail

compose_file="compose.test.yml"
base_url="http://127.0.0.1:3100"
health_body_file="$(mktemp)"

cleanup() {
  docker compose -f "$compose_file" down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -f "$health_body_file"
}
trap cleanup EXIT

docker compose -f "$compose_file" up --detach --build --wait app

healthy_body="$(curl --fail --silent --show-error "$base_url/api/health")"
if [[ "$healthy_body" != *'"database":"ok"'* ]]; then
  echo "Unerwartete Health-Antwort: $healthy_body" >&2
  exit 1
fi

LOAD_BASE_URL="$base_url" node tests/load/basic-load.mjs

docker compose -f "$compose_file" stop db
sleep 1

status=""
for _ in $(seq 1 20); do
  status="$(curl --silent --max-time 8 --output "$health_body_file" --write-out '%{http_code}' "$base_url/api/health" || true)"
  [[ "$status" == "503" ]] && break
  sleep 1
done

if [[ "$status" != "503" ]]; then
  echo "Healthcheck meldet bei DB-Ausfall HTTP $status statt 503." >&2
  exit 1
fi

if ! grep -q '"database":"unavailable"' "$health_body_file"; then
  echo "Healthcheck kennzeichnet die Datenbank nicht als unavailable." >&2
  exit 1
fi

echo "Container-Start und DB-Ausfall wurden erfolgreich geprüft."
