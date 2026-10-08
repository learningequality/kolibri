# shellcheck shell=bash
# Read-modify-write cycle shared by publish.sh and promote.sh: sourced, not run.
# See README.md for the publishing model.
#
# Env:
#   KOLIBRI_APT_BUCKET   GCS bucket name; the repo lives under its
#                        downloads/kolibri/apt prefix, alongside the release
#                        downloads (required)
#   REPREPRO_SIGN_KEY    key id/fingerprint for SignWith + pubkey.asc export (required)
#
# Sets WORKDIR; the reprepro tree is $WORKDIR/repo.
set -euo pipefail

: "${KOLIBRI_APT_BUCKET:?KOLIBRI_APT_BUCKET must be set (GCS bucket name)}"
: "${REPREPRO_SIGN_KEY:?REPREPRO_SIGN_KEY must be set (signing key id/fingerprint)}"

REPO_ROOT="gs://$KOLIBRI_APT_BUCKET/downloads/kolibri/apt"

_REPO_SH_DIR=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)

WORKDIR=$(mktemp -d)
trap 'rm -rf "$WORKDIR"' EXIT
mkdir -p "$WORKDIR/repo/conf"

# suite_version <suite> <pkg> — the version <suite> serves, empty if none.
# Captured, not piped into `grep -q`: an early grep exit SIGPIPEs reprepro,
# which pipefail reports as "not published".
suite_version() {
  reprepro -b "$WORKDIR/repo" --list-format '${version}\n' list "$1" "$2" | sort -u
}

repo_pull() {
  # --- sync down (full tree) ------------------------------------------------
  # The whole tree must be fetched so the deleting up-leg does not delete state we
  # never saw. A masked download failure followed by the deleting up-leg would
  # wipe the live repo, so only a genuinely empty prefix may skip the down-leg.
  #
  # `gcloud storage ls` exits non-zero both for a genuinely empty prefix and for
  # a transient network/throttle/auth failure — exit status alone cannot tell
  # them apart. Inspect the listing instead: a clean exit means objects exist
  # (sync down); the unambiguous "matched no objects" error means the prefix is
  # empty (skip); any other failure is fatal and must abort *before* the
  # destructive up-leg rather than fall through to "starting fresh".
  if ls_err=$(gcloud storage ls "$REPO_ROOT/**" 2>&1 >/dev/null); then
    gcloud storage rsync -r "$REPO_ROOT" "$WORKDIR/repo"
  elif printf '%s' "$ls_err" | grep -qiF 'matched no objects'; then
    echo "empty prefix — first publish, starting fresh"
  else
    echo "aborting: cannot list $REPO_ROOT to confirm it is empty" >&2
    printf '%s\n' "$ls_err" >&2
    exit 1
  fi

  # --- render conf (committed template always wins) -------------------------
  sed "s/__REPREPRO_SIGN_KEY__/$REPREPRO_SIGN_KEY/" \
    "$_REPO_SH_DIR/conf/distributions.in" > "$WORKDIR/repo/conf/distributions"
}

# --checksums-only is required, not cosmetic: reprepro rewrites db/*.db in place,
# often without changing size or mtime (fixed-size BDB pages, sub-second rewrite).
# A default mtime+size comparison then skips the modified db, leaving the
# published db stale against the freshly-exported pool/dists — a silently
# inconsistent repo.
#
# Cache-Control is set per prefix, not once for the tree: a cached index served
# against a newer pool is a Hash Sum mismatch for the client, while pool files
# never change once published.
_sync_up() {
  gcloud storage rsync -r --checksums-only --delete-unmatched-destination-objects \
    --cache-control="$2" "$WORKDIR/repo/$1" "$REPO_ROOT/$1"
}

repo_push() {
  # --- export the served public key -----------------------------------------
  gpg --armor --export "$REPREPRO_SIGN_KEY" > "$WORKDIR/repo/pubkey.asc"

  # --- sync up (checksum compare, delete extras) ----------------------------
  # pool goes first, so no index is ever published naming a file that is not there.
  _sync_up pool 'public, max-age=2592000'
  _sync_up dists 'no-cache'
  # reprepro's own state: read back by the next publish, never by a client.
  _sync_up db 'no-cache'
  _sync_up conf 'no-cache'

  # Root files are rewritten in place rather than versioned, so they stay uncached.
  for root_file in "$WORKDIR"/repo/*; do
    [ -f "$root_file" ] || continue
    gcloud storage cp --cache-control='no-cache' "$root_file" "$REPO_ROOT/${root_file##*/}"
  done
}
