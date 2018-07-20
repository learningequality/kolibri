#!/usr/bin/env bash

set -euo pipefail

make dockerenvdist
buildkite-agent artifact upload 'dist/*.whl'
buildkite-agent artifact upload 'dist/*.tar.gz'
buildkite-agent artifact upload 'dist/*.pex'
