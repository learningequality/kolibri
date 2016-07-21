#!/bin/bash

set -e

PREVIOUS_CWD=`pwd`

# Goto location of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../../"

# Install build deps
pip install -r requirements/build.txt

# Build .whl
npm install
make dist
pip install dist/kolibri-*.whl

cd "$PREVIOUS_CWD"

exit 0
