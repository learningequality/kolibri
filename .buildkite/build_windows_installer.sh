#!/usr/bin/env bash

set -euo pipefail

PARENT_PATH=$(pwd)
KOLIBRI_DOCKER_PATH="$PARENT_PATH/windows_installer_docker_build"
KOLIBRI_WINDOWS_PATH="$KOLIBRI_DOCKER_PATH/kolibri-installers/windows"

mkdir dist
buildkite-agent artifact download 'dist/*.whl' dist/
make writeversion

# Clone kolibri windows installer base in develop branch.
cd $KOLIBRI_DOCKER_PATH \
    && git clone https://github.com/learningequality/kolibri-installers.git \
    && cd kolibri-installers \
    && git checkout develop

# Copy kolbri whl file at KOLIBRI_WINDOWS_PATH path.
cd $PARENT_PATH
cp $PARENT_PATH/dist/*.whl $KOLIBRI_WINDOWS_PATH

# Build kolibri windows installer docker image.
cd $KOLIBRI_DOCKER_PATH
KOLIBRI_VERSION=$(cat $PARENT_PATH/kolibri/VERSION)
DOCKER_BUILD_CMD="docker build -t $KOLIBRI_VERSION-build ."
$DOCKER_BUILD_CMD
if [ $? -ne 0 ]; then
    echo ".. Abort!  Error running $DOCKER_BUILD_CMD."
    exit 1
fi

INSTALLER_PATH="$KOLIBRI_DOCKER_PATH/installer"
mkdir -p $INSTALLER_PATH

# Run kolibri windows installer docker image.
DOCKER_RUN_CMD="docker run -v $INSTALLER_PATH:/installer/ $KOLIBRI_VERSION-build"
$DOCKER_RUN_CMD
if [ $? -ne 0 ]; then
    echo ".. Abort!  Error running $DOCKER_RUN_CMD."
    exit 1
fi

# Upload built kolibri windows installer at buildkite artifact.
cd $KOLIBRI_DOCKER_PATH
buildkite-agent artifact upload './installer/*.exe'
