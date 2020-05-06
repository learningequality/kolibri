#! /usr/bin/env bash

set -euo pipefail

# A file, managed by Docker, with the ID of the created container.
# Provides a consistent, unique reference to the container without using a tag.
# Tags don't work well with concurrent builds run by the same script.
CIDFILE=docker-deb.cid

# Required dir if pre-populating tarball
mkdir -p build_src

docker image build -t "learningequality/kolibri-deb" .
docker run --cidfile $CIDFILE "learningequality/kolibri-deb"

CID=$(cat $CIDFILE)

docker cp $CID:/kolibribuild/dist .
docker rm $CID && rm $CIDFILE
