#!/bin/sh
# Guards promote.sh's version checks. reprepro's copy exits 0 when the package
# is missing and when it downgrades the target, so these must hold without it:
# a pin `proposed` does not serve aborts before the deleting up-leg, and stable
# is never downgraded.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

require_tools reprepro gpg dpkg-deb dpkg rsync

PUBLISH="$HERE/../publish.sh"
PROMOTE="$HERE/../promote.sh"

setup_workdir
fake_gcloud
make_ephemeral_signing_key
export REPREPRO_SIGN_KEY="$FPR"
export KOLIBRI_APT_BUCKET="fake-bucket"
BUCKET="$FAKE_GCS_ROOT/fake-bucket/downloads/kolibri/apt"
STABLE="$BUCKET/dists/stable/main/binary-amd64/Packages"

build_min_deb kolibri 1.0
build_min_deb kolibri 1.1~b1
build_min_deb kolibri 2.0

# assert_promote_refused <message> <pin>... — exits non-zero, never syncs up.
assert_promote_refused() {
  _msg=$1
  shift
  : > "$FAKE_GCS_RSYNC_LOG"
  if bash "$PROMOTE" "$@" >"$WORK/promote.out" 2>&1; then
    fail "$_msg: promote.sh exited 0"
  fi
  assert_absent "$FAKE_GCS_RSYNC_LOG" '--delete-unmatched-destination-objects' \
    "$_msg: promote.sh still reached the deleting up-leg"
}

# --- a prerelease published while the final awaits approval ----------------
bash "$PUBLISH" "$WORK/kolibri_1.0_all.deb"
bash "$PUBLISH" "$WORK/kolibri_1.1~b1_all.deb"
assert_promote_refused "pin superseded in proposed" kolibri=1.0
assert_contains "$WORK/promote.out" '1\.1~b1' "refusal does not name the version proposed serves"
assert_equals "$(versions_of "$STABLE" kolibri)" "" "the prerelease reached stable"

# --- a package proposed never held -----------------------------------------
assert_promote_refused "package absent from proposed" kolibri=1.1~b1 kolibri-server=1.1~b1

# --- malformed pins: an empty version must not match stable's empty one -----
assert_promote_refused "empty version" kolibri=
assert_promote_refused "empty package" =1.1~b1
assert_promote_refused "pin without a version" kolibri

# --- stable already serves the pinned version -------------------------------
bash "$PUBLISH" "$WORK/kolibri_2.0_all.deb"
bash "$PROMOTE" kolibri=2.0
bash "$PROMOTE" kolibri=2.0 || fail "re-promoting the version stable serves failed"

# --- patch for an older line: stable is not downgraded ----------------------
bash "$PUBLISH" "$WORK/kolibri_1.0_all.deb"
bash "$PROMOTE" kolibri=1.0 || fail "promoting an older version than stable's failed"
assert_equals "$(versions_of "$STABLE" kolibri)" "2.0" "promotion downgraded stable"

# --- rollback: an explicit --allow-downgrade copies the older version -------
bash "$PROMOTE" --allow-downgrade kolibri=1.0
assert_equals "$(versions_of "$STABLE" kolibri)" "1.0" "--allow-downgrade did not roll stable back"
assert_promote_refused "--allow-downgrade with an unserved pin" --allow-downgrade kolibri=2.0

echo "PASS: unserved pins abort before the up-leg; stable is downgraded only with --allow-downgrade"
