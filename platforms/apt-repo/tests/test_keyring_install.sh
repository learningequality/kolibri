#!/bin/sh
# HTTPS keyring bootstrap and upgrade from the 1.0 deb822 conffile.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

PI_KEY="$REPO_ROOT/platforms/raspberry-pi/files/learningequality.asc"
KEYRING_KEY="$APT_REPO/keyring/kolibri-archive-keyring.asc"
assert_file "$KEYRING_KEY" "$KEYRING_KEY missing"
assert_files_equal "$PI_KEY" "$KEYRING_KEY" \
  "kolibri-archive-keyring.asc differs from the Pi trust key"

require_tools docker

CLIENT_IMAGES="debian:trixie ubuntu:16.04 ubuntu:18.04 ubuntu:24.04"
for image in $CLIENT_IMAGES; do
  docker image inspect "$image" >/dev/null 2>&1 || docker pull "$image"
done

OUTPUT=$(mktemp)
VOLUME="kolibri-keyring-${OUTPUT##*/}"
cleanup() {
  status=$1
  rm -f "$OUTPUT"
  docker rm -f "$VOLUME" >/dev/null 2>&1 || true
  docker volume rm "$VOLUME" >/dev/null || {
    cleanup_status=$?
    if [ "$status" -eq 0 ]; then
      status=$cleanup_status
    fi
  }
  exit "$status"
}
trap 'cleanup "$?"' EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
docker volume create "$VOLUME" >/dev/null

run_fixture_container() {
  image=$1
  label=$2
  shift 2
  docker create -i --pull=never --name "$VOLUME" -v "$REPO_ROOT:/src:ro" "$@" "$image" sh -eu >/dev/null
  docker start -ai "$VOLUME" <&3 > "$OUTPUT" &
  wait "$!" || { cat "$OUTPUT"; fail "$label ($image) failed"; }
  cat "$OUTPUT"
  assert_absent "$OUTPUT" '^FAIL:'
  assert_output_contains "$(cat "$OUTPUT")" '^PASS:' "$label ($image) did not reach its PASS assertion"
  docker rm "$VOLUME" >/dev/null
}

run_fixture_container ubuntu:24.04 "build signed HTTPS repository" -v "$VOLUME:/fixture" 3<<'BUILD'
export DEBIAN_FRONTEND=noninteractive
bash /src/.github/scripts/apt-install.sh --no-install-recommends \
  build-essential debhelper dpkg-dev gnupg openssl reprepro rsync >/dev/null

APT=/src/platforms/apt-repo
. "$APT/tests/lib.sh"
setup_workdir
fake_gcloud
make_ephemeral_signing_key
export REPREPRO_SIGN_KEY="$FPR"
export KOLIBRI_APT_BUCKET=fake-bucket

cp -a "$APT/keyring" "$WORK/keyring"
gpg --armor --export "$FPR" > "$WORK/keyring/kolibri-archive-keyring.asc"
(cd "$WORK/keyring" && dpkg-buildpackage -b -us -uc)
set -- "$WORK"/kolibri-archive-keyring_*_all.deb
CURRENT_KEYRING_DEB="$1"
dpkg-deb -f "$CURRENT_KEYRING_DEB" Version > /fixture/keyring-version

stage_min_deb kolibri-archive-keyring 1.0
mkdir -p "$STAGE/etc/apt/sources.list.d" "$STAGE/usr/share/keyrings"
cat > "$STAGE/etc/apt/sources.list.d/kolibri.sources" <<'SOURCE'
Types: deb
URIs: https://apt.learningequality.org/
Suites: stable
Components: main
Signed-By: /usr/share/keyrings/kolibri-archive-keyring.asc
SOURCE
echo /etc/apt/sources.list.d/kolibri.sources > "$STAGE/DEBIAN/conffiles"
cp "$WORK/keyring/kolibri-archive-keyring.asc" "$STAGE/usr/share/keyrings/"
export KOLIBRI_KEYRING_DEB=/fixture/kolibri-archive-keyring_1.0_all.deb
dpkg-deb -Zgzip --build "$STAGE" "$KOLIBRI_KEYRING_DEB"

stage_min_deb kolibri 1.0
dpkg-deb -Zgzip --build "$STAGE" "$WORK/kolibri_1.0_all.deb"
bash "$APT/publish.sh" "$WORK/kolibri_1.0_all.deb"
bash "$APT/promote.sh" kolibri=1.0
KOLIBRI_KEYRING_DEB="$CURRENT_KEYRING_DEB" bash "$APT/promote.sh" kolibri=1.0
cp -a "$FAKE_GCS_ROOT/$KOLIBRI_APT_BUCKET/downloads/kolibri/apt" /fixture/repo

openssl req -x509 -newkey rsa:2048 -nodes -days 1 -subj '/CN=Kolibri Test CA' \
  -addext 'keyUsage=critical,keyCertSign' \
  -keyout "$WORK/ca.key" -out /fixture/ca.crt
openssl req -new -newkey rsa:2048 -nodes -subj '/CN=apt.learningequality.org' \
  -keyout /fixture/server.key -out "$WORK/server.csr"
cat > "$WORK/server.ext" <<'CERT'
subjectAltName=DNS:apt.learningequality.org
authorityKeyIdentifier=keyid:always
CERT
openssl x509 -req -days 1 -in "$WORK/server.csr" -CA /fixture/ca.crt \
  -CAkey "$WORK/ca.key" -CAcreateserial -CAserial "$WORK/ca.srl" \
  -extfile "$WORK/server.ext" -out /fixture/server.crt
echo "PASS: signed HTTPS repository built"
BUILD

run_keyring_client() {
  run_fixture_container "$1" "$2 keyring install" -e "INSTALL_MODE=$2" -v "$VOLUME:/fixture:ro" 3<<'CLIENT'
export DEBIAN_FRONTEND=noninteractive LC_ALL=C
APT=/src/platforms/apt-repo
. "$APT/tests/lib.sh"
bash /src/.github/scripts/apt-install.sh --no-install-recommends python3 >/dev/null
if [ "$INSTALL_MODE" != fresh ]; then
  apt-get install -y --no-install-recommends ca-certificates >/dev/null
  apt-get install -y --no-install-recommends /fixture/kolibri-archive-keyring_1.0_all.deb
fi
if [ "$INSTALL_MODE" != upgrade ]; then
  apt-get install -y --no-install-recommends /fixture/repo/kolibri-archive-keyring.deb
fi
rm -f /etc/apt/sources.list
find /etc/apt/sources.list.d -type f ! -name kolibri.sources -delete
cp /fixture/ca.crt /usr/local/share/ca-certificates/kolibri-test.crt
update-ca-certificates >/dev/null
serve_docroot_tls /fixture/repo /fixture/server.crt /fixture/server.key \
  dists/stable/InRelease apt.learningequality.org
fixture_apt() {
  apt-get -o Acquire::Retries=0 -o Acquire::http::Timeout=10 -o Acquire::https::Timeout=10 "$@"
}
update_from_repo() {
  # apt 1.2 can exit successfully even when signature verification fails.
  fixture_apt update > /tmp/update.out 2>&1 \
    || { cat /tmp/update.out; fail "apt-get update failed"; }
  cat /tmp/update.out
  assert_absent /tmp/update.out '^(W|E|Err|Warning|Error):'
}

install_kolibri() {
  fixture_apt install -y --no-install-recommends "$1"
  assert_equals "$(dpkg-query -W -f='${Version}' kolibri)" 1.0
}

if [ "$INSTALL_MODE" = upgrade ]; then
  cat > /etc/apt/sources.list.d/kolibri-proposed.sources <<'SOURCE'
Types: deb
URIs: https://apt.learningequality.org/
Suites: proposed
Components: main
Signed-By: /usr/share/keyrings/kolibri-archive-keyring.asc
SOURCE
  update_from_repo
  install_kolibri kolibri/stable
  fixture_apt install -y --no-install-recommends kolibri-archive-keyring/stable </dev/null
fi

if [ "$INSTALL_MODE" != fresh ]; then
  installed=$(dpkg-query -W -f='${Version}' kolibri-archive-keyring)
  dpkg --compare-versions "$installed" gt 1.0 || fail "Keyring stayed at $installed"
  assert_equals "$installed" "$(cat /fixture/keyring-version)"
  assert_files_equal "$APT/keyring/kolibri.sources" /etc/apt/sources.list.d/kolibri.sources \
    "Keyring upgrade did not replace the stock 1.0 conffile"
fi
if [ "$INSTALL_MODE" = upgrade ]; then
  update_from_repo
  rm /etc/apt/sources.list.d/kolibri-proposed.sources
  fixture_apt purge -y kolibri
  fixture_apt clean
fi
update_from_repo
if [ "$INSTALL_MODE" = fresh ]; then
  install_kolibri kolibri
else
  install_kolibri kolibri/stable
fi
echo "PASS: Kolibri installed from the signed HTTPS repository ($INSTALL_MODE)"
CLIENT
}

run_keyring_client ubuntu:16.04 upgrade-local
for image in ubuntu:18.04 debian:trixie; do
  run_keyring_client "$image" upgrade
done

for image in $CLIENT_IMAGES; do
  run_keyring_client "$image" fresh
done
