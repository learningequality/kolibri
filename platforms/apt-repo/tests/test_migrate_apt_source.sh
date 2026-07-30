#!/bin/sh
# AC#6/#7 harness for migrate-apt-source.sh — proves the cutover snippet
# rewrites an existing github.io Kolibri source to apt.learningequality.org,
# is a no-op when no such source is present (Launchpad-PPA install), is
# idempotent, and does not abort a `set -e` postinst on the no-match case.
#
# Pure shell + coreutils; no docker/reprepro needed. Each case builds a
# throwaway fixture dir and points KOLIBRI_APT_SOURCES_DIR at it.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

SNIPPET="$HERE/../migrate-apt-source.sh"
assert_file "$SNIPPET" "$SNIPPET missing"

setup_workdir

# --- Case A: rewrite (AC#6) --------------------------------------------------
# A deb822 .sources naming the old kolibri-server host, plus a legacy one-line
# .list naming the old kolibri-installer-debian host. Both must move to the
# unified apt.learningequality.org root, dropping the per-installer path.
A="$WORK/case_a"
mkdir -p "$A"
cat > "$A/learningequality-kolibri-server.sources" <<'EOF'
Types: deb
URIs: https://learningequality.github.io/kolibri-server/
Suites: stable
Components: main
Signed-By: /etc/apt/keyrings/learningequality.asc
EOF
cat > "$A/learningequality-debian.list" <<'EOF'
deb [signed-by=/etc/apt/keyrings/learningequality.asc] https://learningequality.github.io/kolibri-installer-debian/ stable main
EOF

KOLIBRI_APT_SOURCES_DIR="$A" sh "$SNIPPET"

assert_contains "$A/learningequality-kolibri-server.sources" 'apt\.learningequality\.org' \
  "Case A: .sources not rewritten to apt.learningequality.org"
assert_contains "$A/learningequality-debian.list" 'apt\.learningequality\.org' \
  "Case A: .list not rewritten to apt.learningequality.org"
assert_absent "$A" 'learningequality\.github\.io' \
  "Case A: a github.io host survived the rewrite"

# --- Case B: no-op (AC#7) ----------------------------------------------------
# A Launchpad-PPA source has no github.io host — the file must be byte-unchanged.
B="$WORK/case_b"
mkdir -p "$B"
cat > "$B/learningequality-ubuntu-kolibri.list" <<'EOF'
deb https://ppa.launchpadcontent.net/learningequality/kolibri/ubuntu noble main
EOF
cp "$B/learningequality-ubuntu-kolibri.list" "$WORK/case_b_orig.list"

KOLIBRI_APT_SOURCES_DIR="$B" sh "$SNIPPET"

assert_files_equal "$B/learningequality-ubuntu-kolibri.list" "$WORK/case_b_orig.list" \
  "Case B: Launchpad PPA source was modified (should be no-op)"

# --- Case C: idempotent ------------------------------------------------------
# A second run over Case A's already-rewritten fixture changes nothing.
cp -a "$A" "$WORK/case_c"
C="$WORK/case_c"
snapshot=$(cat "$C"/* )
KOLIBRI_APT_SOURCES_DIR="$C" sh "$SNIPPET"
assert_equals "$(cat "$C"/*)" "$snapshot" \
  "Case C: second run mutated an already-rewritten fixture"

# --- Case D: sourced under `set -e`, no match, must not abort (AC#7 path) -----
# The postinst sources the snippet and calls the function under `set -e`; on a
# no-match install grep exits 1 — that must not abort. Mimic the integration.
KOLIBRI_APT_SOURCES_DIR="$B" sh -e -c ". '$SNIPPET'; migrate_kolibri_apt_source; echo OK" \
  > "$WORK/case_d.out" 2>&1 || fail "Case D: aborted under set -e on no-match"
assert_contains "$WORK/case_d.out" '^OK$' \
  "Case D: did not reach OK (sourced call aborted under set -e)"

echo "PASS: rewrite, no-op, idempotent, and set -e no-match all green"
