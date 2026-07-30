#!/bin/sh
# AC#4/#5 harness for the kolibri-archive-keyring package — proves the .deb
# builds and installs the apt source file + signing key, and that apt-get
# update parses the new source with no manually-added line.
#
# The build + install run inside a debian:trixie-slim container (the repo is
# bind-mounted) so the host needs only docker. A guard first asserts the
# shipped key is byte-identical to the committed Pi trust key.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

# --- key-drift guard (runs without docker) ----------------------------------
PI_KEY="$REPO_ROOT/platforms/raspberry-pi/files/learningequality.asc"
KEYRING_KEY="$APT_REPO/keyring/kolibri-archive-keyring.asc"
assert_file "$KEYRING_KEY" "$KEYRING_KEY missing"
assert_files_equal "$PI_KEY" "$KEYRING_KEY" \
  "kolibri-archive-keyring.asc differs from the Pi trust key"

require_tools docker

# --- build + install in a clean Debian 13 container -------------------------
# The container builds the native package, installs it, and asserts the two
# packaged paths exist plus that apt-get update parses kolibri.sources (network
# permitting; a host-unreachable run still proves the source is syntactically
# valid and trusted rather than aborting on a malformed-source/NO_PUBKEY error).
run_debian_container keyring <<'EOF'
export DEBIAN_FRONTEND=noninteractive
apt-get update >/dev/null
apt-get install -y --no-install-recommends build-essential debhelper dpkg-dev ca-certificates >/dev/null

# Build from a writable copy (dpkg-buildpackage writes to the parent dir).
cp -a /src/platforms/apt-repo /tmp/apt-repo
cd /tmp/apt-repo/keyring
dpkg-buildpackage -b -us -uc

DEB=$(ls /tmp/apt-repo/kolibri-archive-keyring_*.deb)
[ -n "$DEB" ] || { echo "FAIL: keyring .deb not built"; exit 1; }
dpkg -i "$DEB"

# AC#4: both packaged paths are installed.
[ -f /etc/apt/sources.list.d/kolibri.sources ] \
  || { echo "FAIL: kolibri.sources not installed"; exit 1; }
[ -f /usr/share/keyrings/kolibri-archive-keyring.asc ] \
  || { echo "FAIL: keyring key not installed"; exit 1; }

# AC#5: apt-get update parses the new source with no manually-added line and no
# syntax/trust error against the new host. A network failure to reach the host
# is tolerated (live fetch is covered by e2e_cutover.sh); a malformed-source or
# NO_PUBKEY error is not. Bound the network so an unreachable host (the
# subdomain is stood up by ops, out of scope here) returns a connection error
# fast instead of hanging on apt's long default retries.
OUT=$(apt-get update \
  -o Acquire::Retries=0 \
  -o Acquire::http::Timeout=5 \
  -o Acquire::https::Timeout=5 2>&1) || true
echo "$OUT"
if echo "$OUT" | grep -Eiq 'Malformed|NO_PUBKEY|not signed|invalid|bad'; then
  echo "FAIL: apt-get update rejected kolibri.sources (syntax/trust error)"
  exit 1
fi
echo "PASS: keyring builds, installs source + key, apt-get update parses it"
EOF
