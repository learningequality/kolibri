#! /bin/bash
# set -euo pipefail

mkdir -p whl

# Allows for building directly from pipeline or trigger
if [[ $BUILDKITE_TRIGGERED_FROM_BUILD_ID ]]
then
  echo "--- Downloading from triggered build"
  buildkite-agent artifact download 'dist/*.whl' whl/ --build ${BUILDKITE_TRIGGERED_FROM_BUILD_ID}
else
  echo "--- Downloading from pip"
  pip3 download -d ./whl kolibri
fi

echo "--- Preparing Environment"

echo "Unpacking whl"
# Duped from Android installer's makefile
# Only unpacks kolibri, ignores useless c extensions to reduce size
unzip -q "whl/kolibri*.whl" "kolibri/*" -x "kolibri/dist/cext*" -d src/


echo "Downloading deps"
pipenv sync --dev 

echo "--- Build .app"

# Sets the environment variable needed for the build to find packages in from whl
echo "PYTHONPATH=$PWD/src/kolibri/dist" > .env

pipenv run pew build

echo "--- :mac: Build .pkg"

pipenv run pew package

# TODO upload directly to google cloud
