#!/bin/bash

set -e

PREVIOUS_CWD=`pwd`

# Goto location of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/../../"

# Install build deps
pip install -r requirements/build.txt
pip install -r requirements/test.txt

# Build .whl
yarn install
make dist > /dev/null
pip install dist/kolibri*.whl

cd "$PREVIOUS_CWD"

exit 0
