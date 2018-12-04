#!/bin/bash

# create the container to be used throughout the script
docker create -t --name android_container \
  --mount type=bind,src=${PWD}/src,dst=/home/kivy/src \
  --mount type=bind,src=${PWD}/scripts,dst=/home/kivy/scripts \
  android_kolibri

# TODO copy the signing key and set appropriate environment variables for prod

# run the container, generating the apk
docker start -a android_container
docker wait android_container

# copy the apk to our host. Handles permissions.
docker cp android_container:/home/kivy/dist/ .

# manually remove the container afterward
docker rm android_container
