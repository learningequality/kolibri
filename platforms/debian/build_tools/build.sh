#! /usr/bin/env bash

set -exo pipefail
# set -euxo pipefail
# removed -u because it was causing an error when reading VIRTUAL_ENV from the environment

# When this script is run with -S, it builds a source package only.
# It will ask to sign the package if the $DEBMAIL gpg key is installed in the system


signfile () {

    local file="$1"
    if [[ "$GPG_PASSPHRASE" != "" ]]
    then
        UNSIGNED_FILE=../"$(basename "$file")"
        ASCII_SIGNED_FILE="${UNSIGNED_FILE}.asc"

        gpg --utf8-strings  --clearsign --armor --textmode --batch --pinentry loopback --passphrase "$GPG_PASSPHRASE" --weak-digest SHA1 --weak-digest RIPEMD160 --output "$ASCII_SIGNED_FILE" "$UNSIGNED_FILE"
        mv -f "$ASCII_SIGNED_FILE" "$UNSIGNED_FILE"
    fi

}

signfiles(){
    local file="$1"
    signfile "$file".dsc
    signfile "$file"_source.buildinfo
    signfile "$file"_source.changes
}


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
DEBFULLNAME="${DEBFULLNAME:-Learning Equality \(Learning Equality\'s public signing key\)}"
DEBEMAIL="${DEBEMAIL:-accounts@learningequality.org>}"

cd $SOURCE_DIR
DEBFULLNAME=$DEBFULLNAME DEBEMAIL=$DEBEMAIL dch -b -v $DEB_VERSION-0ubuntu1 'New upstream release'
DEBFULLNAME=$DEBFULLNAME DEBEMAIL=$DEBEMAIL dch -r 'New upstream release'

# package can't be run from a virtualenv
if [[ "$VIRTUAL_ENV" != "" ]]
then
  export  PATH=`echo $PATH | tr ":" "\n" | grep -v $VIRTUAL_ENV | tr "\n" ":"`
  unset VIRTUAL_ENV
fi

if [[ "$BUILD_BINARY" -eq "0" ]]; then
    # build source package only
   dpkg-buildpackage -S  --no-sign
   signfiles kolibri-source_$DEB_VERSION-0ubuntu1
else
    # build with unsigned source, changes and gzip compression
    dpkg-buildpackage -A -Zgzip -z3 -us -uc
fi

