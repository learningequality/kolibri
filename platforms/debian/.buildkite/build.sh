#!/usr/bin/env bash

set -eo pipefail

mkdir build_src

if [[ $LE_TRIGGERED_FROM_BUILD_ID ]]
then
  echo "--- Downloading from triggered build"
  buildkite-agent artifact download "dist/*.tar.gz" . --build $LE_TRIGGERED_FROM_BUILD_ID
  mv dist build_src
  if [[ -z $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
  then
    buildkite-agent annotate "This is a rebuild from a triggered build. Using parent's tarball" --style warning
  fi
fi

make docker-deb

# Upload all built .deb files (one) as a buildkite artifact.
buildkite-agent artifact upload './dist/*.deb'
