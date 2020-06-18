#!/usr/bin/env bash

set -euo pipefail

docker build \
  --iidfile build_test_iid \
  -t testing_worksheet \
  -f docker/build_test_worksheet.dockerfile \
  .

CIDFILE=build_test_cid

# If any error occurs, remove the CIDFILE that's about to be generated
trap "rm $CIDFILE" err

docker run \
  --cidfile $CIDFILE \
  -e GOOGLE_SPREADSHEET_CREDENTIALS \
  -e BUILDKITE_TAG \
  -e BUILDKITE_PULL_REQUEST_BASE_BRANCH \
  -v $GOOGLE_SPREADSHEET_CREDENTIALS:$GOOGLE_SPREADSHEET_CREDENTIALS \
  $(cat ./build_test_iid)

CID=$(cat $CIDFILE)

# Now that we know a container was created, remove it on exit
trap "rm build_test_iid && docker rm $CID" exit

docker cp \
  $CID:/kolibri/.buildkite/spreadsheet-link.txt \
  $PWD/.buildkite/

buildkite-agent artifact upload '.buildkite/spreadsheet-link.txt'
