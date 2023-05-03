#! /usr/bin/env bash

set -eo pipefail
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
    local file=../"$1"
    signfile "$file".dsc
    fixup_buildinfo "$file".dsc "$file"_source.buildinfo
    signfile "$file"_source.buildinfo
    fixup_changes dsc "$file".dsc "$file"_source.changes
    fixup_changes buildinfo "$file"_source.buildinfo "$file"_source.changes
    signfile "$file"_source.changes
}

fixup_control() {
    # This code has been copied from the debsign utility included in the devscripts package
    local filter_out="$1"
    local childtype="$2"
    local parenttype="$3"
    local child="$4"
    local parent="$5"
    test -r "$child" || {
	echo "$PROGNAME: Can't read .$childtype file $child!" >&2
	return 1
    }

    local md5=$(md5sum "$child" | cut -d' ' -f1)
    local sha1=$(sha1sum "$child" | cut -d' ' -f1)
    local sha256=$(sha256sum "$child" | cut -d' ' -f1)
    perl -i -pe 'BEGIN {
    '" \$file='$child'; \$md5='$md5'; "'
    '" \$sha1='$sha1'; \$sha256='$sha256'; "'
    $size=(-s $file); ($base=$file) =~ s|.*/||;
    $infiles=0; $inmd5=0; $insha1=0; $insha256=0; $format="";
    }
    if(/^Format:\s+(.*)/) {
	$format=$1;
	die "Unrecognised .$parenttype format: $format\n"
	    unless $format =~ /^\d+(\.\d+)*$/;
	($major, $minor) = split(/\./, $format);
	$major+=0;$minor+=0;
	die "Unsupported .$parenttype format: $format\n"
	    if('"$filter_out"');
    }
    /^Files:/i && ($infiles=1,$inmd5=0,$insha1=0,$insha256=0);
    if(/^Checksums-Sha1:/i) {$insha1=1;$infiles=0;$inmd5=0;$insha256=0;}
    elsif(/^Checksums-Sha256:/i) {
	$insha256=1;$infiles=0;$inmd5=0;$insha1=0;
    } elsif(/^Checksums-Md5:/i) {
	$inmd5=1;$infiles=0;$insha1=0;$insha256=0;
    } elsif(/^Checksums-.*?:/i) {
	die "Unknown checksum format: $_\n";
    }
    /^\s*$/ && ($infiles=0,$inmd5=0,$insha1=0,$insha256=0);
    if ($infiles &&
	/^ (\S+) (\d+) (\S+) (\S+) \Q$base\E\s*$/) {
	$_ = " $md5 $size $3 $4 $base\n";
	$infiles=0;
    }
    if ($inmd5 &&
	/^ (\S+) (\d+) \Q$base\E\s*$/) {
        $_ = " $md5 $size $base\n";
        $inmd5=0;
    }
    if ($insha1 &&
	/^ (\S+) (\d+) \Q$base\E\s*$/) {
	$_ = " $sha1 $size $base\n";
	$insha1=0;
    }
    if ($insha256 &&
	/^ (\S+) (\d+) \Q$base\E\s*$/) {
	$_ = " $sha256 $size $base\n";
	$insha256=0;
    }' "$parent"
}

fixup_buildinfo() {
    fixup_control '($major != 0 or $minor > 2) and ($major != 1 or $minor > 0)' dsc buildinfo "$@"
}

fixup_changes() {
    local childtype="$1"
    shift
    fixup_control '$major!=1 or $minor > 8 or $minor < 7' $childtype changes "$@"
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

