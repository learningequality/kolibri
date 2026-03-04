#!/bin/bash

set -e

SUDO=""
[ "$(id -u)" != "0" ] && SUDO="sudo"

# Detect Ubuntu series for PPA source line
# On Ubuntu: use the OS codename. On non-Ubuntu (e.g. Debian): require PPA_SERIES env var.
. /etc/os-release
if [ "$ID" = "ubuntu" ]; then
  SERIES="$VERSION_CODENAME"
else
  SERIES="${PPA_SERIES:?PPA_SERIES must be set for non-Ubuntu systems (e.g. PPA_SERIES=noble)}"
fi

gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys DC5BAA93F9E4AE4F0411F97C74F88ADB3194DD81
gpg --output /tmp/learningequality-kolibri.gpg --export DC5BAA93F9E4AE4F0411F97C74F88ADB3194DD81
$SUDO mv /tmp/learningequality-kolibri.gpg /usr/share/keyrings/learningequality-kolibri.gpg

echo "deb [signed-by=/usr/share/keyrings/learningequality-kolibri.gpg] http://ppa.launchpad.net/learningequality/kolibri/ubuntu $SERIES main" \
  | $SUDO tee /etc/apt/sources.list.d/learningequality-ubuntu-kolibri.list > /dev/null
