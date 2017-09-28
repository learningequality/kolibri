#!/bin/bash

docker run -i --rm -v ${PWD}/bin:/mnt/bin kolibrikivy /bin/bash << COMMANDS
  cp /home/kivy/bin/*.apk /mnt/bin
  echo Changing owner from \$(id -u):\$(id -g) to $(id -u):$(id -u)
  chown -R $(id -u):$(id -u) /mnt/bin
COMMANDS