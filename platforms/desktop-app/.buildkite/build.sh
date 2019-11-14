#! /bin/bash

# Setting for debug purposes
set -exuo pipefail


# Allows for building directly from pipeline or trigger
if [[ $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
then
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


echo "Downloading deps"
pipenv sync --dev 

echo "--- Build .app"

# Sets the environment variable needed for the build to find packages in from whl
echo "PYTHONPATH=$PWD/src/kolibri/dist" > .env

# Putting output in file, errors stil log to stderr 
pipenv run pew build | tee full_app_build_log.txt > /dev/null

buildkite-agent artifact upload full_app_build_log.txt

echo "--- :mac: Build .dmg"

pipenv run pew package

# This doesn't actually exist, so we have to manually pass it.
if [[ "$(buildkite-agent meta-data exists triggered_from_job_id)" ]]
then
  echo "Overwriting job to upload to locally"
  BUILDKITE_JOB_ID = $(buildkite agent met-data get triggered_from_job_id)
fi


buildkite-agent artifact upload "package/osx/kolibri*.dmg" --job $BUILDKITE_JOB_ID

# TODO upload directly to google cloud
