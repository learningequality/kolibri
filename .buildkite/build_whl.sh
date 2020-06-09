#!/usr/bin/env bash

set -euo pipefail

echo '--- Building environment'
make dockerenvbuild

echo '--- Building installers'
make dockerenvdist
buildkite-agent artifact upload 'dist/*.whl'
buildkite-agent artifact upload 'dist/*.zip'
buildkite-agent artifact upload 'dist/*.tar.gz'
buildkite-agent artifact upload 'dist/*.pex'
