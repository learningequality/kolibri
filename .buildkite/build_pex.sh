#!/usr/bin/env sh

buildkite-agent artifact download 'dist/*.whl' dist/
make pex
buildkite-agent artifact upload 'dist/*.pex'
