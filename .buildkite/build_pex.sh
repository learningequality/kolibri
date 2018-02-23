#!/usr/bin/env bash

set -euo pipefail

pip install pex\<1.3  # pex is really the only thing we need here.
buildkite-agent artifact download 'dist/*.whl' dist/
make pex
buildkite-agent artifact upload 'dist/*.pex'
