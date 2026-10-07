#!/usr/bin/env bash
# Copy pinned versions from proposed to stable in one read-modify-write.
# See README.md "Promotion".
#
# Usage: promote.sh [--allow-downgrade] PKG=VERSION [PKG=VERSION...]
#
# --allow-downgrade  roll stable back to an older pinned version.
#
# Env: repo.sh's, plus
#   KOLIBRI_KEYRING_DEB  optional path to the kolibri-archive-keyring .deb; when set it
#                        is includedeb'd into stable AND, when stable serves it, copied to
#                        the bucket root as the version-less kolibri-archive-keyring.deb
#                        for the new-user curl bootstrap.
set -euo pipefail

allow_downgrade=false
if [ "${1:-}" = --allow-downgrade ]; then
  allow_downgrade=true
  shift
fi

if [ "$#" -lt 1 ]; then
  echo "usage: promote.sh [--allow-downgrade] PKG=VERSION [PKG=VERSION...]" >&2
  exit 2
fi

# An empty version would equal stable's empty version and pass as promoted.
for pin in "$@"; do
  case $pin in
    ?*=?*) ;;
    *)
      echo "aborting: pin '$pin' is not PKG=VERSION" >&2
      exit 1
      ;;
  esac
done

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/repo.sh"

repo_pull

copy=()
for pin in "$@"; do
  pkg=${pin%%=*}
  ver=${pin#*=}
  # copy downgrades stable with only a warning, so a patch for an older line
  # must be skipped here. Checked first, so a re-run of a promoted release
  # skips even after proposed has moved on.
  stable=$(suite_version stable "$pkg")
  if [ "$stable" = "$ver" ] || { [ -n "$stable" ] && ! "$allow_downgrade" &&
    dpkg --compare-versions "$stable" gt "$ver"; }; then
    echo "stable already serves $pkg $stable — not promoting $ver"
    continue
  fi
  # reprepro copy has no PKG=VERSION form and exits 0 when the package is
  # absent, so check every pin before copying any: a prerelease published while
  # the final awaited approval must not reach stable.
  proposed=$(suite_version proposed "$pkg")
  if [ "$proposed" != "$ver" ]; then
    echo "aborting: proposed serves $pkg ${proposed:-(nothing)}, not $ver" >&2
    exit 1
  fi
  copy+=("$pkg")
done

if [ "${#copy[@]}" -gt 0 ]; then
  reprepro -b "$WORKDIR/repo" copy stable proposed "${copy[@]}"
fi

# --- keyring + bootstrap deb at the repo root (optional) --------------------
# keyring/kolibri.sources names only stable, so keyring updates land there, and
# only on promotion: a key rotation must not reach stable clients unapproved.
# CI rebuilds the keyring every run, and reprepro refuses a same-version .deb
# whose bytes differ, so keep a version stable already serves. stable is never
# downgraded: a release from an older branch builds an older keyring.
if [ -n "${KOLIBRI_KEYRING_DEB:-}" ]; then
  keyring_pkg=$(dpkg-deb -f "$KOLIBRI_KEYRING_DEB" Package)
  keyring_ver=$(dpkg-deb -f "$KOLIBRI_KEYRING_DEB" Version)
  served=$(suite_version stable "$keyring_pkg")
  if [ -z "$served" ] || dpkg --compare-versions "$served" lt "$keyring_ver"; then
    reprepro -b "$WORKDIR/repo" includedeb stable "$KOLIBRI_KEYRING_DEB"
    served=$keyring_ver
  fi
  # Bootstrap with the keyring apt serves, not an older one skipped above.
  if [ "$served" = "$keyring_ver" ]; then
    cp "$KOLIBRI_KEYRING_DEB" "$WORKDIR/repo/kolibri-archive-keyring.deb"
  fi
fi

repo_push
