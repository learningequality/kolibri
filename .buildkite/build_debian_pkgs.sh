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

# Install the new .deb for testing purposes...
docker run --env-file ./docker/env.list -v $PWD/dist:/kolibridist -e "DEBIAN_FRONTEND=noninteractive" "learningequality/kolibri-deb" bash -c "dpkg -i /kolibridist/*.deb"

# Upload built kolibri windows installer at buildkite artifact.
buildkite-agent artifact upload './dist/*.deb'
