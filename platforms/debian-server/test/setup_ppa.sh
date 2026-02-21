#!/bin/bash

set -e

gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys DC5BAA93F9E4AE4F0411F97C74F88ADB3194DD81
gpg --output /usr/share/keyrings/learningequality-kolibri.gpg --export  DC5BAA93F9E4AE4F0411F97C74F88ADB3194DD81

echo "deb [signed-by=/usr/share/keyrings/learningequality-kolibri.gpg] http://ppa.launchpad.net/learningequality/kolibri/ubuntu jammy main" \
  > /etc/apt/sources.list.d/learningequality-ubuntu-kolibri.list
