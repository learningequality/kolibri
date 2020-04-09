#!/usr/bin/env bash

set -eo pipefail

if [[ $LE_TRIGGERED_FROM_BUILD_ID ]]
then
  echo "--- Downloading from triggered build"
  buildkite-agent artifact download "dist/*.tar.gz" . --build $LE_TRIGGERED_FROM_BUILD_ID
  mv dist src

  if [[ -z $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
  then
    buildkite-agent annotate "This is a rebuild from a triggered build. Using parent's tarball" --style warning
  fi
else
  echo "--- Downloading from pip"
  TARBALL_DIR="/tmp/src"
  CID_FILE="pip_dl_cid.txt"
  docker run --cidfile $CID_FILE python:3 \
    pip3 download \
      --no-binary :all: \
      -d $TARBALL_DIR \
      kolibri

  DOCKER_ID=$(cat $CID_FILE) && rm $CID_FILE

  # Copies entire directory, including folder name
  docker cp $DOCKER_ID:$TARBALL_DIR .
  docker rm $DOCKER_ID
fi