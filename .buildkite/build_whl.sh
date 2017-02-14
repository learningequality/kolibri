l#!/usr/bin/env bash

make dockerenvdist
buildkite-agent artifact upload 'dist/*.whl'
buildkite-agent artifact upload 'dist/*.tar.gz'
