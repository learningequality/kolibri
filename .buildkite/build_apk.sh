#!/usr/bin/env bash

set -euo pipefail

# clone a fresh copy of the latest Kolibri Android repository
yes y | rm -r kolibri-android-wrapper/ || true 2> /dev/null
git clone https://github.com/learningequality/kolibri-android-wrapper.git

# copy in the latest pex to make it available to the Docker build script
buildkite-agent artifact download 'dist/*.pex' dist/
cp dist/*.pex kolibri-android-wrapper/kolibri.pex

# build the APK
cd kolibri-android-wrapper
docker build -t kolibriandroid .
cd ..

# copy the APK out of the Docker image
docker run -i --rm -v ${PWD}/dist:/mnt/dist kolibriandroid /bin/bash << COMMANDS
cp /*.apk /mnt/dist
echo Changing owner from \$(id -u):\$(id -g) to $(id -u):$(id -u)
chown -R $(id -u):$(id -u) /mnt/dist
COMMANDS

# upload the APK to Buildkite
buildkite-agent artifact upload 'dist/*.apk'
