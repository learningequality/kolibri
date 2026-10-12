#!/usr/bin/env bash
# Read-modify-write publish of the Kolibri self-hosted APT repo.
# See README.md for the publishing model.
#
# Usage: publish.sh DEB_PATH [DEB_PATH...]
#
# Env: repo.sh's.
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: publish.sh DEB_PATH [DEB_PATH...]" >&2
  exit 2
fi

# Each suite serves one version per package, so a second .deb of a package would
# replace the first, whichever is newer.
dupes=$(for deb in "$@"; do dpkg-deb -f "$deb" Package; done | sort | uniq -d)
if [ -n "$dupes" ]; then
  echo "aborting: more than one .deb of: $dupes" >&2
  exit 1
fi

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/repo.sh"

repo_pull

# --- add the release .deb(s) ------------------------------------------------
# A published version is immutable, and reprepro refuses a same-version .deb whose
# bytes differ with a hard error. That would fail any re-publish of a rebuilt
# artifact — CI rebuilds the keyring .deb every run, and a re-run of a release job
# rebuilds its .deb too. Keep what is already published and say so; ship changes by
# bumping the version. A version stable serves counts as published too: once
# proposed has moved on, a re-run of a promoted release must not touch it.
#
# Each suite serves one version per package, and includedeb silently skips a
# version older than the suite's. Remove any other version first, so proposed
# serves the build just published — a patch release after a newer prerelease
# included.
#
# A version no suite serves has no pool file left, so reprepro cannot refuse its
# rebuild, yet the CDN may still cache the old bytes at that pool path (repo.sh's
# pool max-age). db/published-debs records every published checksum, so a rebuild
# is refused; republish the release asset instead.
published_debs="$WORKDIR/repo/db/published-debs"
mkdir -p "${published_debs%/*}"
touch "$published_debs"
for deb in "$@"; do
  pkg=$(dpkg-deb -f "$deb" Package)
  ver=$(dpkg-deb -f "$deb" Version)
  arch=$(dpkg-deb -f "$deb" Architecture)
  published=$(suite_version proposed "$pkg")
  if [ "$published" = "$ver" ] || [ "$(suite_version stable "$pkg")" = "$ver" ]; then
    echo "$pkg $ver already published — keeping the published build"
    continue
  fi
  sha=$(sha256sum "$deb" | cut -d' ' -f1)
  recorded=$(awk -v k="$pkg $ver $arch" '$1" "$2" "$3 == k { print $4 }' "$published_debs")
  if [ -n "$recorded" ] && [ "$recorded" != "$sha" ]; then
    echo "aborting: $pkg $ver $arch was published with other bytes; publish its release asset" >&2
    exit 1
  fi
  if [ -n "$published" ]; then
    reprepro -b "$WORKDIR/repo" remove proposed "$pkg"
  fi
  reprepro -b "$WORKDIR/repo" includedeb proposed "$deb"
  [ -n "$recorded" ] || echo "$pkg $ver $arch $sha" >> "$published_debs"
done

repo_push
