#! /usr/bin/env bash

set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

DEB_VERSION=`cat dist/VERSION | sed -s 's/^\+\.\+\.\+\([abc]\|\.dev\)/\~\0/g'`

echo "--- Running uupdate on current source"
# Go to current kolibri source to run uupdate, then come back
cd kolibri-source-*
uupdate --no-symlink -b -v $DEB_VERSION ../dist/kolibri_archive.tar.gz
cd -

echo "--- Running debuild on new source"
# Go to new kolibri source to run debuild, then come back
cd kolibri-source-$DEB_VERSION
debuild --no-lintian -us -uc -Zgzip -z3
cd -

mv *.deb dist/
