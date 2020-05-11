#! /usr/bin/env bash

set -euo pipefail

export BOUND_DIR="/kolibri-deb"

# Docker images in which tests will run.
# Can override this variable with envvars or GNU Make variable overrides.
if [[ -z $DOCKER_IMAGES ]]
then
  echo "Using default image set"
  DOCKER_IMAGES="\
    ubuntu:focal \
    ubuntu:bionic \
    ubuntu:xenial \
    ubuntu:trusty \
  "
fi

echo "--- Tests will be run in $DOCKER_IMAGES"

# Running a script in runtime rather than building new images so cache is never
# used. Catches package repository changes, etc.
# DOCKER_IMAGES supplied by make.
for IMAGE in $DOCKER_IMAGES
do
  echo "--- Running tests in $IMAGE"
  docker run \
    -i --rm \
    -v $PWD/build_tools:$BOUND_DIR/build_tools \
    -v $PWD/dist:$BOUND_DIR/dist \
    -e BOUND_DIR $IMAGE \
    $BOUND_DIR/build_tools/test.sh
done
