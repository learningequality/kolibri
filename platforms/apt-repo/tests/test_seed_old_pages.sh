#!/bin/sh
# AC#8 harness for seed_old_pages.sh — proves the one-shot seed pushes a .deb
# into the old gh-pages repo without dropping the packages already there, and
# is safe to run again (the duplicate version is a non-fatal no-op).
#
# Uses only local tooling: a bare git repo stands in for the old Pages repo and
# KOLIBRI_SEED_REMOTE_BASE points the script at it (no GitHub access).
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

require_tools reprepro gpg dpkg-deb git

SEED="$HERE/../seed_old_pages.sh"
assert_file "$SEED" "$SEED missing"

setup_workdir
make_ephemeral_signing_key

build_min_deb kolibri-server    # the cutover .deb the seed pushes
build_min_deb preexisting-pkg   # already in the old repo — must survive

# --- bare git repo standing in for the old Pages repo -----------------------
# Seed it on gh-pages with a working reprepro layout (using the ephemeral key)
# and one pre-existing package, exactly as the real archived repo would be.
BARE="$WORK/kolibri-server.git"
git init --quiet --bare "$BARE"

SEEDCLONE="$WORK/seedclone"
git clone --quiet "$BARE" "$SEEDCLONE"
git -C "$SEEDCLONE" checkout --quiet -b gh-pages
mkdir -p "$SEEDCLONE/conf"
cat > "$SEEDCLONE/conf/distributions" <<EOF
Origin: Learning Equality
Label: Kolibri
Codename: stable
Suite: stable
Architectures: amd64 arm64
Components: main
Description: Old Pages repo
SignWith: $FPR
EOF
reprepro -b "$SEEDCLONE" includedeb stable "$WORK/preexisting-pkg_1.0_all.deb" >/dev/null
git -C "$SEEDCLONE" add -A
git -C "$SEEDCLONE" -c user.email=t@e.co -c user.name=t commit --quiet -m "seed old repo"
git -C "$SEEDCLONE" push --quiet origin gh-pages

export KOLIBRI_SEED_REMOTE_BASE="file://$WORK"

assert_branch_has_both() {
  # Fresh clone of the pushed gh-pages HEAD; both packages must be present.
  chk="$WORK/check-$1"
  git clone --quiet --branch gh-pages --single-branch "$BARE" "$chk"
  P="$chk/dists/stable/main/binary-amd64/Packages"
  assert_file "$P" "($1): $P missing on pushed branch"
  assert_contains "$P" '^Package: kolibri-server$' \
    "($1): seeded kolibri-server not on pushed branch"
  assert_contains "$P" '^Package: preexisting-pkg$' \
    "($1): pre-existing package dropped (rebuilt fresh?)"
  ls "$chk"/pool/main/*/*/kolibri-server_1.0_all.deb >/dev/null 2>&1 \
    || fail "($1): kolibri-server .deb missing from pool/"
}

# --- first run: pushes the cutover .deb -------------------------------------
# Invoke via bash (the script's own shebang) — it uses bash arrays, so running
# it under a plain `sh`/dash would abort on a syntax error.
bash "$SEED" --deb "$WORK/kolibri-server_1.0_all.deb" --repo kolibri-server
assert_branch_has_both run1

# --- second run: safe to run again (duplicate version is a non-fatal no-op) --
bash "$SEED" --deb "$WORK/kolibri-server_1.0_all.deb" --repo kolibri-server \
  || fail "second run exited non-zero (not safe to run again)"
assert_branch_has_both run2

echo "PASS: seed pushes cutover .deb, preserves prior package, safe to run again"
