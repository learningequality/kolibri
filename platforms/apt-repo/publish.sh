#!/usr/bin/env bash
# Read-modify-write publish of the Kolibri self-hosted APT repo.
# See README.rst for the publishing model.
#
# Usage: publish.sh DEB_PATH [DEB_PATH...]
#
# Env:
#   KOLIBRI_APT_BUCKET   repo root — "gs://.../apt" in CI, a local dir in tests (required)
#   REPREPRO_SIGN_KEY    key id/fingerprint for SignWith + pubkey.asc export (required)
#   KOLIBRI_KEYRING_DEB  optional path to the kolibri-archive-keyring .deb; when set it
#                        is includedeb'd AND copied to the bucket root as the version-less
#                        kolibri-archive-keyring.deb for the new-user curl bootstrap.
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: publish.sh DEB_PATH [DEB_PATH...]" >&2
  exit 2
fi
: "${KOLIBRI_APT_BUCKET:?KOLIBRI_APT_BUCKET must be set (repo root: gs://.../apt or a local dir)}"
: "${REPREPRO_SIGN_KEY:?REPREPRO_SIGN_KEY must be set (signing key id/fingerprint)}"

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
mkdir -p "$WORKDIR/repo/conf"

# --- sync down (full tree) --------------------------------------------------
# The whole tree must be fetched so the `-d` up-leg does not delete state we
# never saw. A masked download failure followed by `-c -d` would wipe the live
# repo, so only a genuinely empty prefix may skip the down-leg.
#
# `gcloud storage ls` exits non-zero both for a genuinely empty prefix and for
# a transient network/throttle/auth failure — exit status alone cannot tell
# them apart. Inspect the listing instead: a clean exit means objects exist
# (sync down); the unambiguous "matched no objects" error means the prefix is
# empty (skip); any other failure is fatal and must abort *before* the
# destructive up-leg rather than fall through to "starting fresh".
case "$KOLIBRI_APT_BUCKET" in
  gs://*)
    if ls_err=$(gcloud storage ls "$KOLIBRI_APT_BUCKET/**" 2>&1 >/dev/null); then
      gcloud storage rsync -r "$KOLIBRI_APT_BUCKET" "$WORKDIR/repo"
    elif printf '%s' "$ls_err" | grep -qiF 'matched no objects'; then
      echo "empty prefix — first publish, starting fresh"
    else
      echo "aborting: cannot list $KOLIBRI_APT_BUCKET to confirm it is empty" >&2
      printf '%s\n' "$ls_err" >&2
      exit 1
    fi
    ;;
  *)
    mkdir -p "$KOLIBRI_APT_BUCKET"
    cp -a "$KOLIBRI_APT_BUCKET/." "$WORKDIR/repo/" 2>/dev/null || true
    ;;
esac

# --- render conf (committed template always wins) ---------------------------
sed "s/__REPREPRO_SIGN_KEY__/$REPREPRO_SIGN_KEY/" \
  "$HERE/conf/distributions.in" > "$WORKDIR/repo/conf/distributions"

# --- add the release .deb(s) ------------------------------------------------
for deb in "$@"; do
  reprepro -b "$WORKDIR/repo" includedeb stable "$deb"
done

# --- export the served public key -------------------------------------------
gpg --armor --export "$REPREPRO_SIGN_KEY" > "$WORKDIR/repo/pubkey.asc"

# --- bootstrap deb at the repo root (optional) ------------------------------
if [ -n "${KOLIBRI_KEYRING_DEB:-}" ]; then
  # The keyring version is fixed across releases, but every CI run rebuilds the
  # .deb, so its bytes differ each time. A blind re-includedeb would hit
  # reprepro's same-version-different-checksum refusal (a hard error) and fail
  # every release after the first. Only add it when this version isn't already
  # published; bump the keyring version to ship a change.
  keyring_pkg=$(dpkg-deb -f "$KOLIBRI_KEYRING_DEB" Package)
  keyring_ver=$(dpkg-deb -f "$KOLIBRI_KEYRING_DEB" Version)
  if reprepro -b "$WORKDIR/repo" list stable "$keyring_pkg" \
      | grep -qF "$keyring_pkg $keyring_ver"; then
    echo "$keyring_pkg $keyring_ver already published — skipping keyring includedeb"
  else
    reprepro -b "$WORKDIR/repo" includedeb stable "$KOLIBRI_KEYRING_DEB"
  fi
  cp "$KOLIBRI_KEYRING_DEB" "$WORKDIR/repo/kolibri-archive-keyring.deb"
fi

# --- sync up (-c -d) --------------------------------------------------------
case "$KOLIBRI_APT_BUCKET" in
  gs://*)
    gcloud storage rsync -r -c -d "$WORKDIR/repo" "$KOLIBRI_APT_BUCKET"
    ;;
  *)
    # --checksum (mirroring the gs:// leg's -c) is required, not cosmetic:
    # reprepro rewrites db/*.db in place, often without changing size or mtime
    # (fixed-size BDB pages, sub-second rewrite). rsync's default size+mtime
    # quick-check then skips the modified db, leaving the published db stale
    # against the freshly-exported pool/dists — a silently inconsistent repo.
    rsync -a --delete --checksum "$WORKDIR/repo/" "$KOLIBRI_APT_BUCKET/"
    ;;
esac
