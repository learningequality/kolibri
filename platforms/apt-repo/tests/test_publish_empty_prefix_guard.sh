#!/bin/sh
# Guards the gs:// sync-down guard in publish.sh: a genuinely empty prefix may
# skip the down-leg, but a transient `gcloud storage ls` failure must NOT be
# mistaken for "empty" — otherwise the destructive up-leg wipes the live repo.
# Both cases are driven through the fake `gcloud` from lib.sh, so no real GCS
# access is needed.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

require_tools reprepro gpg dpkg-deb rsync

PUBLISH="$HERE/../publish.sh"

setup_workdir
fake_gcloud
make_ephemeral_signing_key
export REPREPRO_SIGN_KEY="$FPR"
build_min_deb aaa-test

export KOLIBRI_APT_BUCKET="fake-bucket"

# --- transient failure: must abort before the destructive up-leg ------------
set +e
FAKE_LS_MODE=transient bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb" >"$WORK/transient.out" 2>&1
rc=$?
set -e
[ "$rc" -ne 0 ] || fail "transient ls failure was treated as success (publish.sh exited 0)"
assert_contains "$WORK/transient.out" 'aborting: cannot list' \
  "transient failure did not abort with the guard message"
# The up-leg is the only rsync that would delete state; it must never run.
[ ! -s "$FAKE_GCS_RSYNC_LOG" ] \
  || fail "transient ls failure still reached a gcloud rsync leg: $(cat "$FAKE_GCS_RSYNC_LOG")"

# --- genuinely empty prefix: skip down-leg, still publish + run up-leg -------
# No FAKE_LS_MODE: the bucket really is empty, so `storage ls` reports it.
bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb" >"$WORK/empty.out" 2>&1 \
  || { cat "$WORK/empty.out"; fail "empty prefix should publish cleanly, not abort"; }
assert_contains "$WORK/empty.out" 'empty prefix' \
  "empty prefix was not detected as a first publish"
assert_contains "$FAKE_GCS_RSYNC_LOG" '^rsync .* --delete-unmatched-destination-objects ' \
  "empty-prefix publish never reached the deleting up-leg"

echo "PASS: transient ls failure aborts before the up-leg; empty prefix publishes fresh"
