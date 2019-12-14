#! /bin/bash

# Setting for debug purposes
set -eo pipefail

if [[ $LE_TRIGGERED_FROM_BUILD_ID ]]
then
  echo "--- Downloading from triggered build"
  buildkite-agent artifact download "dist/*.whl" . --build $LE_TRIGGERED_FROM_BUILD_ID
  if [[ -z $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
  then
    buildkite-agent annotate "This is a rebuild from a triggered build. Using parent's whl" --style warning 
  fi
elif [[ $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
then
  # Dupe for now, to support existing pipeline
  echo "--- Downloading from triggered build"
  buildkite-agent artifact download "dist/*.whl" . --build $BUILDKITE_TRIGGERED_FROM_BUILD_ID
else
  echo "--- Downloading from pip"
  mkdir -p dist
  pip3 download -d ./dist kolibri
fi

echo "--- Preparing Environment"

echo "Unpacking whl"
# Duped from Android installer's makefile
# Only unpacks kolibri, ignores useless c extensions to reduce size
unzip -q "dist/kolibri*.whl" "kolibri/*" -x "kolibri/dist/cext*" -d src/
rm -rf ./src/kolibri/dist/enum


echo "Downloading deps"
pipenv sync --dev 

echo "--- Build .app"

# Sets the environment variable needed for the build to find packages in from whl
echo "PYTHONPATH=$PWD/src/kolibri/dist" > .env

# Putting output in file, errors stil log to stderr 
mkdir -p logs

# compile message catalogs
pipenv run python i18n.py

pipenv run pew build | tee logs/full_app_build_log.txt > /dev/null

buildkite-agent artifact upload logs/full_app_build_log.txt

echo "--- :mac: Build .dmg"

pipenv run pew package

echo "--- Uploading"

MACOS_VERSION_INDICATOR=$(git describe --exact-match --tags || git rev-parse --short HEAD)

# Clear dist so that the dmg is in the same dir as the rest of the packages
rm -r dist/* && mv package/osx/kolibri*.dmg \
  dist/kolibri-$(more src/kolibri/VERSION)-macos-$MACOS_VERSION_INDICATOR.dmg

EXTERNAL_JOB_ID=$(buildkite-agent meta-data get triggered_from_job_id || echo $LE_TRIGGERED_FROM_JOB_ID)

if [[ $EXTERNAL_JOB_ID ]]
then
  # Environment var doesn't exist my default, so we have to manually pass it.
  buildkite-agent artifact upload "dist/kolibri*.dmg" \
    --job $EXTERNAL_JOB_ID
fi

# Always upload to the local build too. Makes things less confusing.
buildkite-agent artifact upload "dist/kolibri*.dmg"

# TODO upload directly to google cloud
