#!/usr/bin/env bash

set -euo pipefail

# Goto location of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Go to parent path (where kolibri sources are assumed to live)
cd "$DIR"
cd ..
PARENT_PATH=`pwd`
cd "$PARENT_PATH"

mkdir -p dist

buildkite-agent artifact download 'dist/*.tar.gz' dist/

make docker-deb

# Upload built kolibri windows installer at buildkite artifact.
buildkite-agent artifact upload './dist/*.deb'
