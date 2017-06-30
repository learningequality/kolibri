#!/usr/bin/env bash

set -euo pipefail

# clone a fresh copy of the latest Kolibri Kivy repository
yes y | rm -r kolibri-kivy/ || true 2> /dev/null
git clone https://github.com/learningequality/kolibri-kivy.git

# copy in the latest whl to make it available to the Docker build script
buildkite-agent artifact download 'dist/*.whl' dist/
cp dist/*.whl kolibri-kivy/

# build the APK
cd kolibri-kivy
./build.sh
cd ..

# extract the APK into the installers directory, and rename it to match the whl
mkdir -p installers
cp kolibri-kivy/bin/*.apk installers/`basename -s .whl dist/*.whl`.apk

# upload the APK to Buildkite
buildkite-agent artifact upload 'installers/*.apk'
