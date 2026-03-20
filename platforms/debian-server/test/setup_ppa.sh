#!/bin/bash

set -e

SUDO=""
[ "$(id -u)" != "0" ] && SUDO="sudo"

# Detect Ubuntu series for PPA source line
# PPA_SERIES env var takes precedence (used by CI to ensure all containers use the same series).
# On Ubuntu without PPA_SERIES: auto-detect from OS. On non-Ubuntu: PPA_SERIES is required.
. /etc/os-release
if [ -n "${PPA_SERIES:-}" ]; then
  SERIES="$PPA_SERIES"
elif [ "$ID" = "ubuntu" ]; then
  SERIES="$VERSION_CODENAME"
else
  echo "Error: PPA_SERIES must be set for non-Ubuntu systems (e.g. PPA_SERIES=noble)" >&2
  exit 1
fi

gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys DC5BAA93F9E4AE4F0411F97C74F88ADB3194DD81
gpg --output /tmp/learningequality-kolibri.gpg --export DC5BAA93F9E4AE4F0411F97C74F88ADB3194DD81
$SUDO mv /tmp/learningequality-kolibri.gpg /usr/share/keyrings/learningequality-kolibri.gpg

echo "deb [signed-by=/usr/share/keyrings/learningequality-kolibri.gpg] http://ppa.launchpad.net/learningequality/kolibri/ubuntu $SERIES main" \
  | $SUDO tee /etc/apt/sources.list.d/learningequality-ubuntu-kolibri.list > /dev/null
