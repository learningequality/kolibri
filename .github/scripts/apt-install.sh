#!/usr/bin/env bash
# apt-get update + install with bounded connections and an overall ceiling.
#
# Usage: apt-install.sh PACKAGE [PACKAGE ...]  (apt-get flags may be passed too)
#
# apt has no total-runtime ceiling of its own: Acquire::*::Timeout bounds a
# single stalled connection and Acquire::Retries multiplies it, so an
# unresponsive archive mirror holds a CI job open for hours rather than failing
# it. The per-connection caps make one bad mirror fail fast enough for the
# retries to reach a working one; `timeout` supplies the ceiling apt lacks.
# Hosted runners hit this often enough to be the single largest source of
# stalled builds.
set -euo pipefail

SUDO=""
if [ "$(id -u)" != "0" ]; then
  SUDO="sudo"
fi

APT_OPTS=(
  -o Acquire::Retries=3
  -o Acquire::http::Timeout=30
  -o Acquire::https::Timeout=30
)

# sudo drops DEBIAN_FRONTEND from the caller's environment, so set it here:
# a package that asks debconf a question waits on the prompt forever otherwise.
APT=(timeout 600 $SUDO env DEBIAN_FRONTEND=noninteractive apt-get "${APT_OPTS[@]}")

"${APT[@]}" update
"${APT[@]}" install -y "$@"
