#!/usr/bin/env bash

set -eo pipefail

if [[ $LE_TRIGGERED_FROM_BUILD_ID ]]
then
  echo "--- Downloading from triggered build"
  buildkite-agent artifact download "dist/*.tar.gz" . --build $LE_TRIGGERED_FROM_BUILD_ID


  if [[ -z $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
  then
    buildkite-agent annotate "This is a rebuild from a triggered build. Using parent's tarball" --style warning
  fi
else
  echo "--- Downloading from pip"
  mkdir -p dist
  pip3 download --no-binary=:all: -d ./dist kolibri

fi

echo "--- Extracting Kolibri Version"
TARBALL=$(ls dist/*.tar.gz | head -n1)
ARCHIVE_NAME=$(basename -s .tar.gz $TARBALL)
tar -zxvf $TARBALL $ARCHIVE_NAME/kolibri/VERSION

docker image build -t "learningequality/kolibri-deb" .
export KOLIBRI_VERSION=$(cat $ARCHIVE_NAME/kolibri/VERSION) && \
docker run --env KOLIBRI_VERSION -v $PWD/dist:/kolibridist "learningequality/kolibri-deb"

# Upload built kolibri windows installer at buildkite artifact.
buildkite-agent artifact upload './dist/*.deb'
