#! /usr/bin/env bash

set -euo pipefail

CIDFILE=docker-deb.cid

docker image build -t "learningequality/kolibri-deb" .
docker run --cidfile $CIDFILE "learningequality/kolibri-deb"

CID=$(cat $CIDFILE)

docker cp $CID:/kolibribuild/dist .
docker rm $CID && rm $CIDFILE
