#!/bin/bash

CONTAINER_HOME=/home/kivy
CONTAINER_NAME=android_container

# create the container to be used throughout the script
echo -ne "Creating container ${CONTAINER_NAME} \n\t id: "
docker create -t --name ${CONTAINER_NAME} \
  --mount type=bind,src=${PWD}/src,dst=${CONTAINER_HOME}/src \
  --mount type=bind,src=${PWD}/scripts,dst=${CONTAINER_HOME}/scripts \
  --env P4A_RELEASE_KEYSTORE=${CONTAINER_HOME} \
  --env P4A_RELEASE_KEYALIAS=${P4A_RELEASE_KEYALIAS} \
  --env P4A_RELEASE_KEYSTORE_PASSWD=${P4A_RELEASE_KEYSTORE_PASSWD} \
  --env P4A_RELEASE_KEYALIAS_PASSWD=${P4A_RELEASE_KEYALIAS_PASSWD} \
  android_kolibri

# make sure the environment variable is defined
if [ "${P4A_RELEASE_KEYSTORE}" ]; then
  # make sure the directory is valid
  if [ -a ${P4A_RELEASE_KEYSTORE} ]; then
    echo -e "Copying the signing key \n\t From ${P4A_RELEASE_KEYSTORE} to ${CONTAINER_NAME}:${CONTAINER_HOME}"
    # copy keystore to same location on the container
    docker cp ${P4A_RELEASE_KEYSTORE} ${CONTAINER_NAME}:${CONTAINER_HOME}}
  fi
fi

# run the container, generating the apk
echo "Starting ${CONTAINER_NAME}"
docker start -a ${CONTAINER_NAME} | grep -v "Copying /"

# copy the apk to our host. Handles permissions.
echo -e "Coping APK \n\t From ${CONTAINER_NAME}:${CONTAINER_HOME}/dist/ to ${PWD}"
docker cp ${CONTAINER_NAME}:${CONTAINER_HOME}/dist/ .

# manually remove the container afterward
echo -n "Removing "
docker rm ${CONTAINER_NAME}
