#!/bin/bash

docker run -i --rm -v ${PWD}/dist/android:/mnt/bin kolibrikivy /bin/bash << COMMANDS
  cp /home/kivy/.local/share/python-for-android/dists/Kolibri_dist/bin/*.apk /mnt/bin
  echo Changing owner from \$(id -u):\$(id -g) to $(id -u):$(id -u)
  chown -R $(id -u):$(id -u) /mnt/bin
COMMANDS
