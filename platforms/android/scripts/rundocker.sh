#!/bin/bash

set -e

SCRIPTDIR=$(realpath "$(dirname "$0")")
SRCDIR=$(dirname "$SCRIPTDIR")
DOCKER=${DOCKER:-"docker"}

BUILD_CACHE_VOLUME="kolibri-android-cache-$ARCH"
BUILD_CACHE_PATH=/cache
BUILD_UID=$(id -u)
BUILD_GID=$(id -g)

# Build array of options to pass to docker run.
RUN_OPTS=(
  -it --rm

  # Mount the cache volume.
  --mount "type=volume,src=${BUILD_CACHE_VOLUME},dst=${BUILD_CACHE_PATH}"

  # Bind mount the source directory into the container and make it the
  # working dirctory.
  --mount "type=bind,src=${SRCDIR},dst=${SRCDIR}"
  --workdir "${SRCDIR}"

  # Run as the calling user and make the cache volume the user's home
  # directory so all the intermediate build outputs (e.g.,
  # ~/.local/share/python-for-android and ~/.gradle) are stored.
  --user "${BUILD_UID}:${BUILD_GID}"
  --env HOME="${BUILD_CACHE_PATH}"

  # Pass through other environment variables.
  --env BUILDKITE_BUILD_NUMBER
  --env P4A_RELEASE_KEYALIAS
  --env P4A_RELEASE_KEYSTORE_PASSWD
  --env P4A_RELEASE_KEYALIAS_PASSWD
  --env ARCH
)

# If the release signing key has been specified and exists, ensure the
# path is absolute and bind mount it readonly into the container.
if [ -e "${P4A_RELEASE_KEYSTORE}" ]; then
  P4A_RELEASE_KEYSTORE=$(realpath "${P4A_RELEASE_KEYSTORE}")
  RUN_OPTS+=(
    --env P4A_RELEASE_KEYSTORE
    --volume "${P4A_RELEASE_KEYSTORE}:${P4A_RELEASE_KEYSTORE}:ro"
  )
fi

exec "${DOCKER}" run "${RUN_OPTS[@]}" android_kolibri "$@"
