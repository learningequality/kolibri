#! /usr/bin/env bash

# set -euo pipefail

DOCKER_IMAGES="ubuntu:xenial ubuntu:bionic ubuntu:trusty"
export BOUND_DIR="/kolibri-deb"

for IMAGE in $DOCKER_IMAGES
do
  docker run \
    --rm -it -v $PWD:$BOUND_DIR -e BOUND_DIR $IMAGE \
    $BOUND_DIR/build_scripts/test.sh
done
