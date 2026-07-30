#!/bin/sh
# AC#10 harness — full self-migration, end-to-end, containerized, no external
# network. Proves a client on the OLD github.io source, after upgrading to the
# cutover release, is rewritten to apt.learningequality.org and fetches later
# updates from there with no manual action.
#
# Everything (key, both repos, the http server, the apt client) runs inside a
# single debian:trixie-slim container so the host needs only docker. Two stand-in
# hosts are served by ONE http.server on port 80 out of one docroot; apt reaches
# them by /etc/hosts + path, since the simple server ignores the Host header:
#   apt.learningequality.org/...          -> <docroot>/...           (NEW repo)
#   learningequality.github.io/kolibri-server/... -> <docroot>/kolibri-server/... (OLD repo)
# The Task-4 snippet rewrites the old URI to apt.learningequality.org, which then
# resolves to the NEW repo at the docroot root — exactly the production cutover.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

require_tools docker

# The container builds both repos, serves them, installs the cutover release, and
# asserts the auto-migration + upgrade.
run_debian_container "e2e cutover" <<'EOF'
export DEBIAN_FRONTEND=noninteractive
apt-get update >/dev/null
apt-get install -y --no-install-recommends \
  reprepro gnupg dpkg-dev python3 >/dev/null

ARCH=$(dpkg --print-architecture)

# --- ephemeral, unprotected signing key -------------------------------------
# The repo is bind-mounted, so the container reuses the host helper.
WORK=/tmp
. /src/platforms/apt-repo/tests/lib.sh
make_ephemeral_signing_key
gpg --armor --export "$FPR" > /tmp/pubkey.asc

# --- build a cutover kolibri-server .deb carrying the Task-4 snippet ---------
# postinst sources the canonical migrate-apt-source.sh (as the real package
# does) and calls the migration function under `set -e`.
build_kolibri_server_deb() {
  stage_min_deb kolibri-server "$1"
  mkdir -p "$STAGE/usr/share/kolibri-server"
  cp /src/platforms/apt-repo/migrate-apt-source.sh "$STAGE/usr/share/kolibri-server/"
  cat > "$STAGE/DEBIAN/postinst" <<'POST'
#!/bin/sh
set -e
case "$1" in
  configure)
    if [ -f /usr/share/kolibri-server/migrate-apt-source.sh ]; then
      . /usr/share/kolibri-server/migrate-apt-source.sh
      migrate_kolibri_apt_source
    fi
    ;;
esac
POST
  chmod 755 "$STAGE/DEBIAN/postinst"
  pack_deb "$2"
}
build_kolibri_server_deb 1.0   /tmp/kolibri-server_1.0_all.deb    # OLD host serves this
build_kolibri_server_deb 1.0.1 /tmp/kolibri-server_1.0.1_all.deb  # NEW host serves the upgrade

# --- build the two reprepro repos into one docroot --------------------------
DOC=/tmp/docroot
build_repo() {
  base="$1"; deb="$2"
  mkdir -p "$base/conf"
  cat > "$base/conf/distributions" <<DIST
Origin: Learning Equality
Label: Kolibri
Codename: stable
Suite: stable
Architectures: $ARCH
Components: main
Description: e2e stand-in repo
SignWith: $FPR
DIST
  reprepro -b "$base" includedeb stable "$deb" >/dev/null
}
build_repo "$DOC/kolibri-server" /tmp/kolibri-server_1.0_all.deb   # OLD (github.io/kolibri-server)
build_repo "$DOC"                /tmp/kolibri-server_1.0.1_all.deb  # NEW (apt.learningequality.org)

# --- serve both hosts from one server; resolve both names to localhost -------
printf '127.0.0.1 apt.learningequality.org\n127.0.0.1 learningequality.github.io\n' >> /etc/hosts
python3 -m http.server 80 --directory "$DOC" >/dev/null 2>&1 &
for i in 1 2 3 4 5 6 7 8 9 10; do
  if python3 -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:80/kolibri-server/dists/stable/Release')" 2>/dev/null; then break; fi
  sleep 0.5
done

# --- client trusts the key and starts on the OLD github.io source -----------
mkdir -p /etc/apt/keyrings
cp /tmp/pubkey.asc /etc/apt/keyrings/learningequality.asc
cat > /etc/apt/sources.list.d/learningequality-kolibri-server.sources <<'SRC'
Types: deb
URIs: http://learningequality.github.io/kolibri-server/
Suites: stable
Components: main
Signed-By: /etc/apt/keyrings/learningequality.asc
SRC
# Isolate to only our source so container base repos don't interfere.
rm -f /etc/apt/sources.list /etc/apt/sources.list.d/debian.sources 2>/dev/null || true

apt-get update >/dev/null

# --- install the cutover release: postinst rewrites the source --------------
apt-get install -y --no-install-recommends kolibri-server >/dev/null
INSTALLED_OLD=$(dpkg-query -W -f='${Version}' kolibri-server)
[ "$INSTALLED_OLD" = "1.0" ] \
  || { echo "FAIL: expected cutover version 1.0 from old repo, got $INSTALLED_OLD"; exit 1; }

# AC#10: the source was auto-rewritten to apt.learningequality.org, no manual action.
SRCFILE=/etc/apt/sources.list.d/learningequality-kolibri-server.sources
grep -q 'apt.learningequality.org' "$SRCFILE" \
  || { echo "FAIL: source not rewritten to apt.learningequality.org"; cat "$SRCFILE"; exit 1; }
if grep -q 'learningequality\.github\.io' "$SRCFILE"; then
  echo "FAIL: github.io host survived on the client source"; exit 1
fi

# --- later update is fetched from the NEW host, no manual action ------------
apt-get update >/dev/null
apt-get install -y --only-upgrade kolibri-server >/dev/null
INSTALLED_NEW=$(dpkg-query -W -f='${Version}' kolibri-server)
[ "$INSTALLED_NEW" = "1.0.1" ] \
  || { echo "FAIL: upgrade not served from apt.learningequality.org (version $INSTALLED_NEW)"; exit 1; }

echo "PASS: old-source client auto-rewritten to apt.learningequality.org and upgraded 1.0 -> 1.0.1 with no manual action"
EOF
