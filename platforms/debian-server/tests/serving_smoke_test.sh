#!/bin/bash
# Assert that Kolibri is actually served through the kolibri-server nginx/uwsgi
# stack after the .deb is installed. This exercises the full chain: a request to
# nginx is proxied to the uWSGI-hosted Kolibri and answered. A 502 means nginx is
# up but uWSGI/Kolibri is not serving yet, so we retry until it comes up.
set -euo pipefail

# Default matches the debconf `kolibri-server/port` default preseeded in CI.
PORT="${KOLIBRI_SERVER_PORT:-8080}"
URL="http://localhost:${PORT}/"
BODY="$(mktemp)"
DEADLINE=$(($(date +%s) + 180))

echo "Waiting for Kolibri to be served at ${URL} ..."
while true; do
  # On a connection failure curl still writes "000" via -w and exits non-zero;
  # keep the fallback as a replacement (not "|| echo", which would append a
  # second "000" and yield "000000", defeating the != "000" retry check).
  STATUS=$(curl -sL -o "${BODY}" -w '%{http_code}' "${URL}") || STATUS="000"
  # A 5xx (e.g. 502) = nginx up but uWSGI/Kolibri not ready; 000 = nginx not up yet.
  if [ "${STATUS}" != "000" ] && [ "${STATUS}" -lt 500 ]; then
    echo "Kolibri responded with HTTP ${STATUS} through nginx."
    break
  fi
  if [ "$(date +%s)" -ge "${DEADLINE}" ]; then
    echo "::error::Kolibri was not served through nginx within the timeout (last status: ${STATUS})."
    echo "--- last response body ---"
    cat "${BODY}" || true
    exit 1
  fi
  echo "  not ready (status: ${STATUS}); retrying in 5s ..."
  sleep 5
done

# Confirm the answer came from Kolibri, not a stray default nginx page.
if ! grep -qi "kolibri" "${BODY}"; then
  echo "::error::Response did not look like a Kolibri page:"
  cat "${BODY}"
  exit 1
fi

echo "Serving smoke test passed: Kolibri is served behind nginx/uWSGI."
