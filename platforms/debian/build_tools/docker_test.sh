#! /usr/bin/env bash

set -euo pipefail

DOCKER_IMAGES="
  ubuntu:focal \
  ubuntu:bionic \
  ubuntu:xenial \
  ubuntu:trusty \
"
export BOUND_DIR="/kolibri-deb"

# Running a script in runtime rather than building new images so cache is never
# used. Catches package repository changes, etc.
for IMAGE in $DOCKER_IMAGES
do
  docker run \
    --rm -it \
    -v $PWD/build_tools:$BOUND_DIR/build_tools \
    -v $PWD/dist:$BOUND_DIR/dist \
    -e BOUND_DIR $IMAGE \
    $BOUND_DIR/build_tools/test.sh
done
