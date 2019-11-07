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
  pip3 download -d ./whl kolibri
fi

echo "--- Environment Prep"
echo "Unpack whl"

# Duped from Android installer's makefile
# Only unpacks kolibri, ignores useless c extensions to reduce size
unzip -q "whl/kolibri*.whl" "kolibri/*" -x "kolibri/dist/cext*" -d src/


echo "Downloading deps"
pipenv sync --dev 

echo "--- :mac: Build app"
PYTHONPATH=$PWD/src/kolibri/dist && pipenv run pew build


# TODO upload directly to google cloud
