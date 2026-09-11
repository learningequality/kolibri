#!/usr/bin/env bash
# Run an adb command under a per-attempt timeout, restarting the adb server
# between attempts.
#
# Usage: adb-retry.sh TIMEOUT ATTEMPTS ADB_ARG [ADB_ARG ...]
#
# adb has no timeout of its own, so an emulator that drops to `device offline`
# mid-command blocks the call until something else kills it — observed as a 29
# minute `adb install` on CI's API 24 image that ended only when the job hit
# its own cap. The emulator process usually survives the dropped connection,
# so restarting the adb server and re-running recovers the run.
set -euo pipefail

if [ "$#" -lt 3 ]; then
  echo "usage: $0 TIMEOUT ATTEMPTS ADB_ARG [ADB_ARG ...]" >&2
  exit 2
fi

attempt_timeout=$1
attempts=$2
shift 2

# Cap on each step of the recovery itself, which can wedge the same way.
RECOVERY_TIMEOUT=60

# macOS has no timeout(1); coreutils installs it as gtimeout. Fail loudly
# rather than silently running uncapped.
TIMEOUT=$(command -v timeout || command -v gtimeout || true)
if [ -z "$TIMEOUT" ]; then
  echo "$0: no timeout(1) on PATH (macOS: brew install coreutils)" >&2
  exit 2
fi

attempt=1
while true; do
  status=0
  "$TIMEOUT" "$attempt_timeout" adb "$@" || status=$?
  if [ "$status" -eq 0 ]; then
    exit 0
  fi
  echo "$0: adb $* failed (exit $status) on attempt $attempt of $attempts" >&2
  if [ "$attempt" -ge "$attempts" ]; then
    exit "$status"
  fi
  attempt=$((attempt + 1))
  "$TIMEOUT" "$RECOVERY_TIMEOUT" adb kill-server || true
  "$TIMEOUT" "$RECOVERY_TIMEOUT" adb wait-for-device || true
done
