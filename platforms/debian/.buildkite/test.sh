#!/usr/bin/env bash

set -eo pipefail

buildkite-agent artifact download "dist/*.deb" .

make docker-test
