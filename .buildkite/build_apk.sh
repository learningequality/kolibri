#!/usr/bin/env bash

ANDROID_REPO_NAME="kolibri-installer-android"

set -euo pipefail

# clone the repo if folder does not exist
if [ ! -d $ANDROID_REPO_NAME ]; then
  echo '--- :robot_face: Cloning android repo'
  git clone https://github.com/learningequality/${ANDROID_REPO_NAME}.git
fi

cd $ANDROID_REPO_NAME
echo $PWD

# Ensure that we're on the latest version of develop
git fetch origin
git checkout origin/develop

echo '--- :ferris_wheel: Copying in latest Kolibri whl'
# copy in the latest whl to make it available to the Docker build script
buildkite-agent artifact download 'dist/*.whl' .
# Should probably already be there
mkdir -p whl
mv dist/*.whl whl/

echo '--- :construction_worker: Building the APK'
# build apk using docker
make run_docker

# upload the APK to Buildkite
# TODO add last argument to change name on upload
cd dist/android/

echo '--- :arrow_up: Uploading to Buildkite'
buildkite-agent artifact upload '*-release.apk'
