#!/bin/bash

set -e

CONTAINER_HOME=/home/kivy

# Specifies the name of the docker volume used to store p4a cache
P4A_CACHE=p4a_cache
PEW_CACHE=pew_cache

# create the container to be used throughout the script
# creates a volume for reuse between builds, holding p4a's android distro
CONTAINER_ID=$(docker create -it \
  --mount type=volume,src=${P4A_CACHE},dst=${CONTAINER_HOME}/.local \
  --mount type=volume,src=${PEW_CACHE},dst=${CONTAINER_HOME}/.pyeverywhere \
  --env P4A_RELEASE_KEYSTORE=${CONTAINER_HOME}/$(basename "${P4A_RELEASE_KEYSTORE}") \
  --env P4A_RELEASE_KEYALIAS \
  --env P4A_RELEASE_KEYSTORE_PASSWD \
  --env P4A_RELEASE_KEYALIAS_PASSWD \
  android_kolibri)

echo -ne "Creating container ${CONTAINER_ID} \n\t id: "

# make sure the environment variable is defined
if [ "${P4A_RELEASE_KEYSTORE}" ]; then
  # make sure the directory is valid
  if [ -a ${P4A_RELEASE_KEYSTORE} ]; then
    echo -e "Copying the signing key \n\t From ${P4A_RELEASE_KEYSTORE} to ${CONTAINER_ID}:${CONTAINER_HOME}"
    # copy keystore to same location on the container
    docker cp ${P4A_RELEASE_KEYSTORE} ${CONTAINER_ID}:${CONTAINER_HOME}
  fi
fi

# run the container, generating the apk
echo "Starting ${CONTAINER_ID}"
docker start -i ${CONTAINER_ID}

# copy the apk to our host. Handles permissions.
echo -e "Coping APK \n\t From ${CONTAINER_ID}:${CONTAINER_HOME}/dist/ to ${PWD}"
docker cp ${CONTAINER_ID}:${CONTAINER_HOME}/dist/ .

# manually remove the container afterward
echo -n "Removing "
docker rm ${CONTAINER_ID}
