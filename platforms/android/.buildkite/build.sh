#! /bin/bash
set -euo pipefail

mkdir -p whl

echo "--- Downloading whl file"

# Allows for building directly from pipeline or trigger
if [[ $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
then
  echo "Downloading from triggered build"
  buildkite-agent artifact download 'dist/*.whl' whl/ --build ${BUILDKITE_TRIGGERED_FROM_BUILD_ID}
else
  echo "Downloading from pip"
  pip download -d ./whl kolibri
fi

echo "--- :android: Build APK"
make run_docker

echo "--- :gcloud: Uploading APK"
# TODO upload directly to google cloud
buildkite-agent artifact upload '*-release.apk'