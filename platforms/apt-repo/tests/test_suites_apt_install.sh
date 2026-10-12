#!/bin/sh
# An apt client installs kolibri and kolibri-server from `proposed` after a
# publish, and from `stable` after promote.sh, trusting only the served
# pubkey.asc — so neither suite is unsigned, missing, or NO_PUBKEY.
#
# publish.sh and promote.sh run inside debian:trixie-slim against the fake
# `gcloud` bucket, which http.server serves as apt.learningequality.org.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

require_tools docker

run_debian_container "suites apt install" <<'EOF'
export DEBIAN_FRONTEND=noninteractive
apt-get update >/dev/null
apt-get install -y --no-install-recommends \
  reprepro gnupg dpkg-dev rsync python3 >/dev/null

WORK=/tmp/work
mkdir -p "$WORK"
. /src/platforms/apt-repo/tests/lib.sh
fake_gcloud
make_ephemeral_signing_key
export REPREPRO_SIGN_KEY="$FPR"
export KOLIBRI_APT_BUCKET="fake-bucket"
APT=/src/platforms/apt-repo

build_min_deb kolibri 1.0
build_min_deb kolibri-server 1.0
bash "$APT/publish.sh" "$WORK/kolibri_1.0_all.deb" "$WORK/kolibri-server_1.0_all.deb" >/dev/null

serve_docroot "$FAKE_GCS_ROOT/fake-bucket/downloads/kolibri/apt" pubkey.asc apt.learningequality.org

# Trust only what the repo serves.
python3 -c "import urllib.request; urllib.request.urlretrieve('http://apt.learningequality.org/pubkey.asc', '/usr/share/keyrings/kolibri-archive-keyring.asc')"
rm -f /etc/apt/sources.list /etc/apt/sources.list.d/*

# assert_suite_installs <suite> — with only <suite> enabled, apt updates cleanly
# and installs both packages at 1.0.
assert_suite_installs() {
  dpkg --purge kolibri kolibri-server >/dev/null 2>&1 || true
  cat > /etc/apt/sources.list.d/kolibri-test.sources <<SRC
Types: deb
URIs: http://apt.learningequality.org/
Suites: $1
Components: main
Signed-By: /usr/share/keyrings/kolibri-archive-keyring.asc
SRC
  apt-get update --error-on=any >/tmp/update.out 2>&1 \
    || { cat /tmp/update.out; fail "apt-get update failed for $1"; }
  apt-get install -y --no-install-recommends kolibri kolibri-server >/tmp/install.out 2>&1 \
    || { cat /tmp/install.out; fail "install from $1 failed"; }
  for pkg in kolibri kolibri-server; do
    v=$(dpkg-query -W -f='${Version}' "$pkg")
    assert_equals "$v" "1.0" "$pkg $v installed from $1, expected 1.0"
  done
}

assert_suite_installs proposed

bash "$APT/promote.sh" kolibri=1.0 kolibri-server=1.0 >/tmp/promote.out 2>&1 \
  || { cat /tmp/promote.out; fail "promote.sh failed"; }
assert_suite_installs stable

echo "PASS: kolibri + kolibri-server install from signed proposed, then from stable after promotion"
EOF
