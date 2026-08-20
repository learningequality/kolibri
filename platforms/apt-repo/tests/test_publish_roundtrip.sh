#!/bin/sh
# AC#1/#2/#3 harness for publish.sh — proves the read-modify-write publish
# preserves prior packages, signs the Release, and serves pubkey.asc. The bucket
# is served by the fake `gcloud` from lib.sh, so this drives publish.sh's real
# gs:// path with no GCS access.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

require_tools reprepro gpg dpkg-deb rsync

PUBLISH="$HERE/../publish.sh"

setup_workdir
fake_gcloud
make_ephemeral_signing_key
export REPREPRO_SIGN_KEY="$FPR"

# Two minimal arch-all .debs with distinct names.
build_min_deb aaa-test
build_min_deb bbb-test

# --- the repo root publish.sh derives from the bucket name ------------------
export KOLIBRI_APT_BUCKET="fake-bucket"
BUCKET="$FAKE_GCS_ROOT/fake-bucket/downloads/kolibri/apt"

# --- two sequential publishes -----------------------------------------------
bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb"
bash "$PUBLISH" "$WORK/bbb-test_1.0_all.deb"

# --- AC#3: both present after the second publish ----------------------------
PKGS="$BUCKET/dists/stable/main/binary-amd64/Packages"
assert_file "$PKGS" "$PKGS missing"
assert_contains "$PKGS" '^Package: aaa-test$' "aaa-test dropped by second publish"
assert_contains "$PKGS" '^Package: bbb-test$' "bbb-test missing after second publish"

# --- AC#2: Release signed + pubkey.asc served -------------------------------
{ [ -f "$BUCKET/dists/stable/Release.gpg" ] || [ -f "$BUCKET/dists/stable/InRelease" ]; } \
  || fail "no signature (Release.gpg / InRelease) on the published Release"
assert_file "$BUCKET/pubkey.asc" "pubkey.asc not served at bucket root"

# --- bootstrap-root path: kolibri-archive-keyring.deb at bucket root ---------
KOLIBRI_KEYRING_DEB="$WORK/aaa-test_1.0_all.deb" bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb"
assert_file "$BUCKET/kolibri-archive-keyring.deb" \
  "kolibri-archive-keyring.deb not served at bucket root"

# --- keyring re-publish across releases (fixed version, rebuilt bytes) --------
# The keyring version stays fixed across releases but CI rebuilds the .deb every
# run, so its bytes differ. publish.sh must not abort on reprepro's
# same-version-different-checksum refusal, or every release after the first would
# fail. Build two byte-different .debs sharing one version and publish both.
build_keyring_variant() {
  stage_min_deb kr-keyring 1.0
  mkdir -p "$STAGE/usr/share/kr"
  echo "rebuild-$1" > "$STAGE/usr/share/kr/data"   # forces distinct bytes
  pack_deb "$WORK/kr-keyring-$1.deb"
}
build_keyring_variant a
build_keyring_variant b
KOLIBRI_KEYRING_DEB="$WORK/kr-keyring-a.deb" bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb"
KOLIBRI_KEYRING_DEB="$WORK/kr-keyring-b.deb" bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb" \
  || fail "keyring re-publish aborted on a rebuilt same-version .deb"

echo "PASS: round-trip preserves prior packages; Release signed; pubkey.asc + bootstrap deb served"
