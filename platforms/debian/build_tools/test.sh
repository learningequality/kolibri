#! /usr/bin/env bash
set -euo pipefail
DEBIAN_FRONTEND=noninteractive

apt-get -y update
apt-get install -y python3-pkg-resources

adduser --disabled-login --gecos "" kolibri

dpkg -i $BOUND_DIR/dist/*.deb

su kolibri -p -c 'kolibri start ; kolibri stop'
