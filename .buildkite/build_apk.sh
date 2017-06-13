#!/usr/bin/env bash

set -euo pipefail


yes y | rm -r kolibri-android-wrapper/ || true 2> /dev/null
git clone https://github.com/learningequality/kolibri-android-wrapper.git

buildkite-agent artifact download 'dist/*.pex' dist/
cp dist/*.pex kolibri-android-wrapper/kolibri.pex

cd kolibri-android-wrapper
docker build -t kolibriandroid .
APK_FILENAME=$(basename `docker run -it kolibriandroid /bin/sh -c "ls /*.apk | tr -d '\n'"`)
(docker run -it kolibriandroid /bin/sh -c "cat /*.apk") > ../dist/$APK_FILENAME
cd ..

buildkite-agent artifact upload 'dist/*.apk'
