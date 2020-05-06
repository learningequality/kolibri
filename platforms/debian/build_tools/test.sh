#! /usr/bin/env bash

# This script runs INSIDE DOCKER CONTAINERS, not locally.
# Called by build_tools/docker_test.sh
# Make edits to the tests run within each environment here.

set -euo pipefail
DEBIAN_FRONTEND=noninteractive
export LC_ALL=C.UTF-8
export LANG=C.UTF-8


apt-get -y update
apt-get install -y python3-pkg-resources

# BOUND_DIR set in build_tools/docker_test.sh
debconf-set-selections $BOUND_DIR/build_tools/preseed.cfg
dpkg -i $BOUND_DIR/dist/*.deb

kolibri start
kolibri stop
