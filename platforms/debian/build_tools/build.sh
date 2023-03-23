#! /usr/bin/env bash

set -euxo pipefail
export DEBIAN_FRONTEND=noninteractive

cd dist
tar xf *orig.tar.gz
# SOURCE_DIR=`tar --exclude="*/*" -tf *.orig.tar.gz|head -1`
SOURCE_DIR=`ls -d kolibri*/`
cp -r ../debian $SOURCE_DIR
DEB_VERSION=`cat VERSION | sed -s 's/^\+\.\+\.\+\([abc]\|\.dev\)/\~\0/g'`
cd $SOURCE_DIR

DEBFULLNAME='Learning Equality' DEBEMAIL=info@learningequality.org dch -v $DEB_VERSION-0ubuntu1 'New upstream release'
DEBFULLNAME='Learning Equality' DEBEMAIL=info@learningequality.org dch -r 'New upstream release'

# package can't be run from a virtualenv
if [[ "$VIRTUAL_ENV" != "" ]]
then
  export  PATH=`echo $PATH | tr ":" "\n" | grep -v $VIRTUAL_ENV | tr "\n" ":"`
  unset VIRTUAL_ENV
fi


# build with unsigned source, changes and gzip compression
VIRTUAL_ENV= fakeroot dpkg-buildpackage -Zgzip -z3 -us -uc

