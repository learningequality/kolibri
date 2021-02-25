#!/usr/bin/env bash

set -euo pipefail

echo "--- Downloading all artifacts here for upload to GH"
mkdir -p dist
buildkite-agent artifact download 'dist/*' dist/

echo "--- Building docker environment in Docker"
# Depends on relevant requirements file and script locations
docker build \
  --iidfile upload_artifacts.iid \
  -f docker/upload_artifacts.dockerfile \
  .

IMAGE=$(cat upload_artifacts.iid)

echo "--- Running script in Docker, image ID: $IMAGE"
# Mounting dist so that we're not redundantly copying
# Adding envars for GH access and Tag information
# Binding google app creds for shared use
docker run \
  --mount type=bind,src=$PWD/dist,target=/dist \
  -e GITHUB_ACCESS_TOKEN \
  -e BUILDKITE_TAG \
  --cidfile upload_artifacts.cid \
  $IMAGE \

CONTAINER=$(cat upload_artifacts.cid)

trap "docker rm $CONTAINER" exit
