#!/usr/bin/env bash

set -euo pipefail

SCRIPTPATH=$(pwd)
PIP_PATH="$SCRIPTPATH/env/bin/pip"
PYTHON_PATH="$SCRIPTPATH/env/bin/python"

echo "Now creating virtualenv..."
virtualenv -p python3.5 env
if [ $? -ne 0 ]; then
    echo ".. Abort!  Can't create virtualenv."
    exit 1
fi

PIP_CMD="$PIP_PATH install -r requirements/pipeline.txt"
echo "Running $PIP_CMD..."
$PIP_CMD
if [ $? -ne 0 ]; then
    echo ".. Abort!  Can't install '$PIP_CMD'."
    exit 1
fi

PYTHON_CMD="$PYTHON_PATH .buildkite/upload_artifacts.py"
echo "Now excuting  upload artifacts script..."
mkdir -p dist
buildkite-agent artifact download 'dist/*.pex' dist/
buildkite-agent artifact download 'dist/*.whl' dist/
buildkite-agent artifact download 'dist/*.tar.gz' dist/
buildkite-agent artifact download 'dist/*.deb' dist/
buildkite-agent artifact download 'dist/*.exe' dist/
# buildkite-agent artifact download 'dist/*.dmg' dist/
buildkite-agent artifact download 'dist/*.zip' dist/

{
    buildkite-agent artifact download '*.exe' dist/ --step "Sign Windows installer"
} || {
    echo "No signed Windows installer found"
}

$PYTHON_CMD
if [ $? -ne 0 ]; then
    echo ".. Abort!  Can't execute '$PYTHON_CMD'."
    exit 1
fi
