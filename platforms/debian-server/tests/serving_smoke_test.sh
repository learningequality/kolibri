#!/bin/bash
set -euo pipefail

# Default matches the debconf `kolibri-server/port` default preseeded in CI.
PORT="${KOLIBRI_SERVER_PORT:-8080}"
URL="http://localhost:${PORT}/api/public/info/"
SANDBOX_PORT="${KOLIBRI_SERVER_SANDBOX_PORT:-8081}"
CONTENT_DIR=/usr/lib/kolibri/packages/kolibri/core/content
SANDBOX_FILE=$(cat "$CONTENT_DIR/build/sandbox_filename")
SANDBOX_URL="http://localhost:${SANDBOX_PORT}/content/static/sandbox/${SANDBOX_FILE}"
BODY="$(mktemp)"
EXPECTED="$(mktemp)"
trap 'rm -f "$BODY" "$EXPECTED"' EXIT
SANDBOX_ASSET="$CONTENT_DIR/static/sandbox/$SANDBOX_FILE"
if [ -f "$SANDBOX_ASSET.file_size" ] && [ ! -s "$SANDBOX_ASSET" ] && [ -f "$SANDBOX_ASSET.gz" ]; then
  gzip -dc "$SANDBOX_ASSET.gz" > "$EXPECTED"
else
  cp "$SANDBOX_ASSET" "$EXPECTED"
fi
DEADLINE=$(($(date +%s) + 180))

echo "Waiting for Kolibri to be served at ${URL} ..."
while true; do
  STATUS=$(curl -s --max-time 5 -o "${BODY}" -w '%{http_code}' "${URL}") || STATUS="000"
  if [ "${STATUS}" = "200" ] &&
    grep -Eq '"application"[[:space:]]*:[[:space:]]*"kolibri"' "${BODY}" &&
    curl --compressed --fail --silent --show-error --max-time 5 "$SANDBOX_URL" -o "$BODY" &&
    cmp -s "$BODY" "$EXPECTED"; then
    echo "Serving smoke test passed: Kolibri and its sandbox are served behind nginx/uWSGI."
    exit 0
  fi
  if [ "$(date +%s)" -ge "${DEADLINE}" ]; then
    echo "::error::Kolibri API and sandbox were not both served through nginx within the timeout (last API status: ${STATUS})."
    echo "--- last response body ---"
    cat "${BODY}" || true
    exit 1
  fi
  echo "  not ready (status: ${STATUS}); retrying in 5s ..."
  sleep 5
done
