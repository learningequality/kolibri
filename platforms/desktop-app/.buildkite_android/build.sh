#! /bin/bash
set -eo pipefail


echo "--- Downloading whl file"

# Allows for building directly from pipeline or trigger
if [[ $LE_TRIGGERED_FROM_BUILD_ID ]]
then
  echo "Downloading from triggered build"
  buildkite-agent artifact download 'dist/*.whl' . --build ${LE_TRIGGERED_FROM_BUILD_ID}
  mv dist whl
else
  echo "Downloading from pip"
  WHL_DIR="/tmp/whl"
  DOCKER_ID=$(docker create python:3 pip download -d $WHL_DIR kolibri)
  docker start -a $DOCKER_ID
  docker cp $DOCKER_ID:$WHL_DIR .
  docker rm $DOCKER_ID
fi

make run_docker

# Making folder structure match other installers (convention)
mv ./dist/android/*.apk ./dist

# if [[ $LE_TRIGGERED_FROM_JOB_ID && $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
# then
#   echo "--- Uploading artifact to parent job"
#   buildkite-agent artifact upload dist/*.apk --job $LE_TRIGGERED_FROM_JOB_ID
# fi

echo "--- Uploading artifact"
buildkite-agent artifact upload dist/*.apk
