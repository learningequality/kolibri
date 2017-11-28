#!/bin/bash

# If you did changes in a package and want the changelog included:
# ./copy_from_package /path/to/kolibri-0.16~b1 -c

set -e

if
	[ "$1" == "" ] ||
	[ "$1" == "-h" ] ||
	[ "$1" == "--help" ]
then
	echo "Copies the debian/ contents of a package to this folder "
	echo "where we maintain the debian/ source in Git."
	echo "usage: ./copy_from_pkg [path-of-pkg]"
	exit
fi

# Goto location of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

test_dir=$1


if [ "$2" == "-c" ]
then
	also_changelog=1
else
	also_changelog=0
fi

dest_dir=`realpath $DIR`

if ! [ -d $test_dir/debian ]
then
	echo "No debian/ found in $test_dir"
	exit 1
fi

test_dir=`realpath $test_dir`

echo "This will overwrite the contents of"
echo "$dest_dir"
echo "with the contents of"
echo "$test_dir"
echo ""

read -p "Are you sure? [y/N] " choice

case "$choice" in
	y|Y )
		git rm -rf --ignore-unmatch --cached $dest_dir/debian/*
		git add $dest_dir/debian
		# Copy everything except the assessment zip from the test pkg dir to this dir
		cd $test_dir
		debclean
		# The below has to run with respect to relative paths, hence the cd and the cp --parents
		cd $test_dir
		find debian -mindepth 1 -not -name '*.zip' -exec cp -rp \{\} --parents $dest_dir \;
		if [ $also_changelog -eq 0 ]
		then
			rm $dest_dir/debian/changelog
		fi
		git reset -- $dest_dir/debian/changelog
		git checkout $dest_dir/debian/changelog
;;
	n|N ) echo "no" ;;
	* ) echo "Okay leaving then..." ;;
esac
