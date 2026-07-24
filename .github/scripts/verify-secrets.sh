#!/usr/bin/env bash
# Fail if any named environment variable is unset or empty, so a release build
# aborts before shipping unsigned artifacts.
#
# Usage: verify-secrets.sh NAME [NAME ...]  (each NAME is an env var to check)
set -euo pipefail

missing=()
for name in "$@"; do
  if [ -z "${!name:-}" ]; then
    missing+=("$name")
  fi
done

if [ ${#missing[@]} -ne 0 ]; then
  echo "::error::Release build requested but signing secrets are missing: ${missing[*]}"
  exit 1
fi
