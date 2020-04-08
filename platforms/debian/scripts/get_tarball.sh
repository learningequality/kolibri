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
  mkdir -p src
  pip3 download --no-binary=:all: -d ./src kolibri
fi