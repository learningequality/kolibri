#!/usr/bin/env bash

set -euo pipefail

# Goto location of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Go to parent path (where kolibri sources are assumed to live)
cd "$DIR"
cd ..
PARENT_PATH=`pwd`
cd "$PARENT_PATH"

make docker-build-sheet

buildkite-agent artifact upload './dist/*.txt'
