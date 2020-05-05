#! /usr/bin/env bash
set -euo pipefail
DEBIAN_FRONTEND=noninteractive

apt-get -y update
apt-get install -y python3-pkg-resources

# Using debconf-set-selections requires that it be an interactive shell
unset DEBIAN_FRONTEND
debconf-set-selections $BOUND_DIR/build_tools/preseed.cfg
dpkg -i $BOUND_DIR/dist/*.deb

kolibri start
kolibri stop
