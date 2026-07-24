# Shared assertion + tooling helpers for the apt-repo shell tests.
#
# Assertions print a "FAIL:" line and exit non-zero when they do not hold, so a
# regression aborts the test instead of passing silently.

fail() { echo "FAIL: $1"; exit 1; }

# APT_REPO / REPO_ROOT, derived from the caller's $HERE (the tests dir).
# e2e_cutover.sh also sources this file inside its container, where $HERE is
# unset and the repo is bind-mounted at a fixed path instead.
if [ -n "${HERE:-}" ]; then
  APT_REPO=$(CDPATH= cd -- "$HERE/.." && pwd)
  REPO_ROOT=$(CDPATH= cd -- "$HERE/../../.." && pwd)
fi

# assert_file <path> [message]
assert_file() {
  [ -f "$1" ] || fail "${2:-expected file to exist: $1}"
}

# assert_contains <file> <extended-regex> [message]
assert_contains() {
  grep -Eq "$2" "$1" || fail "${3:-expected /$2/ in $1}"
}

# assert_absent <file-or-dir> <extended-regex> [message] — recursive
assert_absent() {
  if grep -rEq "$2" "$1"; then fail "${3:-unexpected match for /$2/ under $1}"; fi
}

# assert_equals <actual> <expected> [message]
assert_equals() {
  [ "$1" = "$2" ] || fail "${3:-expected '$2', got '$1'}"
}

# assert_output_contains <string> <extended-regex> [message] — use on captured
# container output, so a silent early exit inside the heredoc is caught.
assert_output_contains() {
  printf '%s\n' "$1" | grep -Eq "$2" || fail "${3:-expected /$2/ in captured output}"
}

# assert_files_equal <a> <b> [message]
assert_files_equal() {
  cmp -s "$1" "$2" || fail "${3:-files differ: $1 vs $2}"
}

# require_tools <tool>... — SKIP (or FAIL under APT_REPO_TESTS_STRICT=1) if any absent
require_tools() {
  for _t in "$@"; do
    command -v "$_t" >/dev/null 2>&1 && continue
    if [ "${APT_REPO_TESTS_STRICT:-0}" = "1" ]; then
      fail "required tool missing under APT_REPO_TESTS_STRICT: $_t (needs: $*)"
    fi
    echo "SKIP: needs $* (missing: $_t)"
    exit 0
  done
}

# setup_workdir — set $WORK to a fresh temp dir, removed on exit along with any
# gpg-agent make_ephemeral_signing_key left holding $GNUPGHOME.
setup_workdir() {
  WORK=$(mktemp -d)
  trap 'gpgconf --kill gpg-agent >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
}

# make_ephemeral_signing_key — generate an unprotected ed25519 key under
# $WORK/gnupg; set GNUPGHOME + FPR (its fingerprint). %no-protection stops
# reprepro's non-interactive Release signing hanging on a pinentry prompt.
make_ephemeral_signing_key() {
  export GNUPGHOME="$WORK/gnupg"
  mkdir -p "$GNUPGHOME"
  chmod 700 "$GNUPGHOME"
  cat > "$WORK/key.spec" <<'EOF'
%no-protection
Key-Type: eddsa
Key-Curve: ed25519
Name-Real: Kolibri Test
Name-Email: test@example.com
Expire-Date: 0
%commit
EOF
  gpg --batch --gen-key "$WORK/key.spec" >/dev/null 2>&1
  FPR=$(gpg --list-secret-keys --with-colons | awk -F: '/^fpr:/ { print $10; exit }')
  [ -n "$FPR" ] || fail "could not create signing key"
}

# stage_min_deb <name> <version> — stage a minimal Architecture:all package tree
# at $STAGE, for the caller to drop payload or maintainer scripts into before
# calling pack_deb.
_stage_n=0
stage_min_deb() {
  _stage_n=$((_stage_n + 1))
  STAGE="$WORK/stage-$_stage_n"
  mkdir -p "$STAGE/DEBIAN"
  cat > "$STAGE/DEBIAN/control" <<EOF
Package: $1
Version: $2
Section: misc
Priority: optional
Architecture: all
Maintainer: Kolibri Test <test@example.com>
Description: test package $1 $2
EOF
}

# pack_deb <out> — build the tree staged at $STAGE into <out>.
pack_deb() {
  dpkg-deb --build "$STAGE" "$1" >/dev/null
}

# build_min_deb <name> — payload-free .deb at $WORK/<name>_1.0_all.deb.
build_min_deb() {
  stage_min_deb "$1" 1.0
  pack_deb "$WORK/${1}_1.0_all.deb"
}

# run_debian_container <label> — run the script on stdin in debian:trixie-slim
# with the repo bind-mounted read-only at /src, and require it to reach a PASS
# line. Callers quote the heredoc (<<'EOF') so $VAR resolves in-container.
run_debian_container() {
  _out=$(docker run --rm -i -v "$REPO_ROOT:/src:ro" debian:trixie-slim sh -eu) \
    || { printf '%s\n' "$_out" >&2; fail "$1 container run exited non-zero"; }
  printf '%s\n' "$_out"
  assert_output_contains "$_out" '^PASS:' "$1 did not reach its PASS assertion"
}
