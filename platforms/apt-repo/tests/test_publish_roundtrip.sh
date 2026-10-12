#!/bin/sh
# AC#1/#2/#3 harness for publish.sh and promote.sh. The bucket is served by the
# fake `gcloud` from lib.sh, so this drives the real gs:// path with no GCS access.
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

# Two minimal arch-all .debs with distinct names.
build_min_deb aaa-test
build_min_deb bbb-test

# --- the repo root publish.sh derives from the bucket name ------------------
export KOLIBRI_APT_BUCKET="fake-bucket"
BUCKET="$FAKE_GCS_ROOT/fake-bucket/downloads/kolibri/apt"
STABLE="$BUCKET/dists/stable/main/binary-amd64/Packages"
PROPOSED="$BUCKET/dists/proposed/main/binary-amd64/Packages"

# --- live bucket written by the stable-only conf ------------------------------
mkdir -p "$BUCKET/conf"
cat > "$BUCKET/conf/distributions" <<EOF
Origin: Learning Equality
Label: Kolibri
Codename: stable
Suite: stable
Architectures: amd64 i386 arm64 armhf
Components: main
Description: Kolibri self-hosted APT repository
SignWith: $FPR
EOF
reprepro -b "$BUCKET" includedeb stable "$WORK/aaa-test_1.0_all.deb" >/dev/null

# --- publishes go to proposed; stable keeps serving -------------------------
bash "$PUBLISH" "$WORK/bbb-test_1.0_all.deb"
assert_file "$PROPOSED" "$PROPOSED missing"
assert_contains "$PROPOSED" '^Package: bbb-test$' "bbb-test not published to proposed"
assert_absent "$STABLE" '^Package: bbb-test$' "publish wrote bbb-test to stable"
assert_contains "$STABLE" '^Package: aaa-test$' "publish orphaned the live stable suite"

# --- AC#3: a second publish keeps the first package -------------------------
build_min_deb ddd-test
bash "$PUBLISH" "$WORK/ddd-test_1.0_all.deb"
assert_contains "$PROPOSED" '^Package: ddd-test$' "ddd-test missing from proposed"
assert_contains "$PROPOSED" '^Package: bbb-test$' "bbb-test dropped by second publish"

# --- a publish replaces the suite's previous version, older or newer ---------
build_min_deb ccc-test 1.0
build_min_deb ccc-test 1.1
build_min_deb ccc-test 0.9
bash "$PUBLISH" "$WORK/ccc-test_1.0_all.deb"
bash "$PUBLISH" "$WORK/ccc-test_1.1_all.deb"
assert_equals "$(versions_of "$PROPOSED" ccc-test)" "1.1" "proposed does not serve exactly 1.1"
bash "$PUBLISH" "$WORK/ccc-test_0.9_all.deb"
assert_equals "$(versions_of "$PROPOSED" ccc-test)" "0.9" \
  "publishing an older version did not replace the newer one in proposed"

# build_rebuilt_deb <name> <version> <out> — same version, distinct bytes.
build_rebuilt_deb() {
  stage_min_deb "$1" "$2"
  echo rebuilt > "$STAGE/rebuilt"
  pack_deb "$3"
}

# --- re-publishing the version proposed serves keeps the published build -----
sha=$(field_of "$PROPOSED" ccc-test SHA256)
build_rebuilt_deb ccc-test 0.9 "$WORK/ccc-test-rebuilt.deb"
bash "$PUBLISH" "$WORK/ccc-test-rebuilt.deb" || fail "re-publishing proposed's ccc-test 0.9 failed"
assert_equals "$(field_of "$PROPOSED" ccc-test SHA256)" "$sha" "re-publishing replaced proposed's ccc-test 0.9 bytes"

# --- two .debs of one package abort before syncing ----------------------------
: > "$FAKE_GCS_RSYNC_LOG"
if bash "$PUBLISH" "$WORK/ccc-test_1.1_all.deb" "$WORK/ccc-test_1.0_all.deb" 2>/dev/null; then
  fail "publishing two ccc-test .debs in one call exited 0"
fi
[ -s "$FAKE_GCS_RSYNC_LOG" ] && fail "publish.sh synced the bucket before refusing duplicate packages"
assert_equals "$(versions_of "$PROPOSED" ccc-test)" "0.9" "a refused publish changed proposed"

# --- a version no suite serves keeps its bytes --------------------------------
build_rebuilt_deb ccc-test 1.0 "$WORK/ccc-test-1.0-rebuilt.deb"
: > "$FAKE_GCS_RSYNC_LOG"
if bash "$PUBLISH" "$WORK/ccc-test-1.0-rebuilt.deb" 2>/dev/null; then
  fail "re-publishing ccc-test 1.0 with other bytes exited 0"
fi
assert_absent "$FAKE_GCS_RSYNC_LOG" '--delete-unmatched-destination-objects' \
  "publish.sh synced the bucket before refusing other bytes for ccc-test 1.0"
bash "$PUBLISH" "$WORK/ccc-test_1.0_all.deb" || fail "re-publishing ccc-test 1.0's original bytes failed"
assert_equals "$(versions_of "$PROPOSED" ccc-test)" "1.0" "re-publishing ccc-test 1.0 did not replace 0.9"

# --- promotion serves the byte-identical .deb in stable ---------------------
build_min_deb kolibri 1.0
build_min_deb kolibri-server 1.0
bash "$PUBLISH" "$WORK/kolibri_1.0_all.deb" "$WORK/kolibri-server_1.0_all.deb"
bash "$PROMOTE" kolibri=1.0 kolibri-server=1.0 || fail "promoting the published versions failed"
for pkg in kolibri kolibri-server; do
  sha=$(sha256sum "$WORK/${pkg}_1.0_all.deb" | cut -d' ' -f1)
  assert_equals "$(field_of "$STABLE" "$pkg" SHA256)" "$sha" "stable does not serve the published $pkg .deb"
  assert_equals "$(versions_of "$PROPOSED" "$pkg")" "1.0" "promotion dropped $pkg from proposed"
done

# --- a later publish leaves stable at the promoted version ------------------
build_min_deb kolibri 1.1
bash "$PUBLISH" "$WORK/kolibri_1.1_all.deb"
assert_equals "$(versions_of "$STABLE" kolibri)" "1.0" "publishing 1.1 moved stable off 1.0"
assert_file "$BUCKET/pool/main/k/kolibri/kolibri_1.0_all.deb" "stable's kolibri 1.0 pool file was removed"

# --- re-running a promoted release after proposed moved on is a no-op --------
build_rebuilt_deb kolibri 1.0 "$WORK/kolibri-rebuilt.deb"
bash "$PUBLISH" "$WORK/kolibri-rebuilt.deb" || fail "re-publishing promoted kolibri 1.0 failed"
assert_equals "$(versions_of "$PROPOSED" kolibri)" "1.1" "re-publishing kolibri 1.0 reverted proposed"
bash "$PROMOTE" kolibri=1.0 || fail "re-promoting kolibri 1.0 after proposed moved on failed"

# --- AC#2: Release signed + pubkey.asc served -------------------------------
{ [ -f "$BUCKET/dists/proposed/Release.gpg" ] || [ -f "$BUCKET/dists/proposed/InRelease" ]; } \
  || fail "no signature (Release.gpg / InRelease) on the published proposed Release"
assert_file "$BUCKET/pubkey.asc" "pubkey.asc not served at bucket root"

# --- bootstrap-root path: promotion serves kolibri-archive-keyring.deb -------
KOLIBRI_KEYRING_DEB="$WORK/aaa-test_1.0_all.deb" bash "$PROMOTE" kolibri=1.0
assert_file "$BUCKET/kolibri-archive-keyring.deb" \
  "kolibri-archive-keyring.deb not served at bucket root"

# --- keyring re-promote across releases (fixed version, rebuilt bytes) --------
# The keyring version stays fixed across releases but CI rebuilds the .deb every
# run, so its bytes differ. promote.sh must not abort on reprepro's
# same-version-different-checksum refusal, or every release after the first would
# fail. Build two byte-different .debs sharing one version and promote both.
build_keyring_variant() {
  stage_min_deb kr-keyring 1.0
  mkdir -p "$STAGE/usr/share/kr"
  echo "rebuild-$1" > "$STAGE/usr/share/kr/data"   # forces distinct bytes
  pack_deb "$WORK/kr-keyring-$1.deb"
}
build_keyring_variant a
build_keyring_variant b
KOLIBRI_KEYRING_DEB="$WORK/kr-keyring-a.deb" bash "$PROMOTE" kolibri=1.0
KOLIBRI_KEYRING_DEB="$WORK/kr-keyring-b.deb" bash "$PROMOTE" kolibri=1.0 \
  || fail "keyring re-promote aborted on a rebuilt same-version .deb"
assert_contains "$STABLE" '^Package: kr-keyring$' "keyring not promoted to stable"

# --- a publish never writes stable, even with a newer keyring ---------------
# Guards against publish.sh regaining the KOLIBRI_KEYRING_DEB hook promote.sh owns.
build_min_deb kr-keyring 1.1
build_min_deb kr-keyring 0.9
cp -r "$BUCKET/dists/stable" "$WORK/stable-before"
cp "$BUCKET/kolibri-archive-keyring.deb" "$WORK/bootstrap-before.deb"
KOLIBRI_KEYRING_DEB="$WORK/kr-keyring_1.1_all.deb" bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb"
diff -r "$WORK/stable-before" "$BUCKET/dists/stable" >/dev/null \
  || fail "a publish with a newer keyring changed dists/stable"
assert_files_equal "$BUCKET/kolibri-archive-keyring.deb" "$WORK/bootstrap-before.deb" \
  "a publish with a newer keyring changed the bootstrap deb"

# --- a release from an older branch does not downgrade stable's keyring ------
KOLIBRI_KEYRING_DEB="$WORK/kr-keyring_1.1_all.deb" bash "$PROMOTE" kolibri=1.0
assert_equals "$(versions_of "$STABLE" kr-keyring)" "1.1" "promotion did not update stable's keyring"
KOLIBRI_KEYRING_DEB="$WORK/kr-keyring_0.9_all.deb" bash "$PROMOTE" kolibri=1.0
assert_equals "$(versions_of "$STABLE" kr-keyring)" "1.1" "an older keyring downgraded stable"
assert_files_equal "$BUCKET/kolibri-archive-keyring.deb" "$WORK/kr-keyring_1.1_all.deb" \
  "the bootstrap deb differs from the keyring stable serves"

echo "PASS: publishes replace proposed's version; promotion serves the same .deb in stable; Release signed; pubkey.asc served; promotion alone writes the keyring + bootstrap deb"
