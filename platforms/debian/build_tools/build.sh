#! /usr/bin/env bash

set -euo pipefail
# set -euxo pipefail

# When this script is run with -S, it builds a source package only.
# It will ask to sign the package if the $DEBMAIL gpg key is installed in the system

BUILD_BINARY=1

while getopts "S" FLAG; do
    case $FLAG in
        S)
        BUILD_BINARY=0
        ;;
    esac
    done


cd dist
tar xf *orig.tar.gz
# SOURCE_DIR=`tar --exclude="*/*" -tf *.orig.tar.gz|head -1`
SOURCE_DIR=`ls -d kolibri*/`
cp -r ../debian $SOURCE_DIR
DEB_VERSION=`cat VERSION | sed -s 's/^\+\.\+\.\+\([abc]\|\.dev\)/\~\0/g'`

# use the environment variables if they are set:
DEBFULLNAME="${DEBFULLNAME:-Learning Equality}"
DEBEMAIL="${DEBEMAIL:-info@learningequality.org}"

cd $SOURCE_DIR
DEBFULLNAME=$DEBFULLNAME DEBEMAIL=$DEBEMAIL dch -v $DEB_VERSION-0ubuntu1 'New upstream release'
DEBFULLNAME=$DEBFULLNAME DEBEMAIL=$DEBEMAIL dch -r 'New upstream release'

# package can't be run from a virtualenv
if [[ "$VIRTUAL_ENV" != "" ]]
then
  export  PATH=`echo $PATH | tr ":" "\n" | grep -v $VIRTUAL_ENV | tr "\n" ":"`
  unset VIRTUAL_ENV
fi

if [ "$BUILD_BINARY" -eq "0" ]; then
    # build source package only
   dpkg-buildpackage -S || { echo "Not signing the sources: GPG secret key for $DEBEMAIL is not available" ; }
else
    # build with unsigned source, changes and gzip compression
    dpkg-buildpackage -Zgzip -z3 -us -uc
fi

