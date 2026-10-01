#!/bin/bash
#
# Installs /tmp/deb/*.deb inside a bare Ubuntu container and checks it runs.
# Run by .github/workflows/install_test.yml; locally:
#
#   docker run --rm -v "$PWD/dist:/tmp/deb" -v "$PWD/tests:/tmp/tests" \
#     -e EXPECT_BUNDLED=1 ubuntu:20.04 /tmp/tests/install_smoke_test.sh
#
# Environment:
#   EXPECT_BUNDLED     non-empty if postinst must install /opt/kolibri/python
#   NO_SYSTEM_PYTHON   non-empty to install with no python3 at all
#   UPGRADE_FROM_DEB   URL of an earlier .deb to install first, then upgrade

set -e

export DEBIAN_FRONTEND=noninteractive TZ=UTC

if [ -n "$NO_SYSTEM_PYTHON" ]; then
  APT_OPTS="--no-install-recommends"
  PREINSTALL="curl adduser"
else
  APT_OPTS=""
  PREINSTALL="curl adduser python3"
fi

apt-get update -qq
apt-get install -y -qq $APT_OPTS $PREINSTALL

if [ -n "$UPGRADE_FROM_DEB" ]; then
  curl -fsSL -o /tmp/previous.deb "$UPGRADE_FROM_DEB"
  dpkg -i /tmp/previous.deb || true
  apt-get install -f -y $APT_OPTS
  echo "Installed kolibri $(dpkg-query -W -f='${Version}' kolibri) from $UPGRADE_FROM_DEB"
fi

# dpkg -i cannot resolve dependencies; apt-get -f installs them
# and dpkg --configure completes the deferred configuration
dpkg -i /tmp/deb/*.deb || true
apt-get install -f -y $APT_OPTS
dpkg --configure -a
dpkg-query -s kolibri | grep -q "^Status: install ok installed$"

check_interpreter() {
  if [ -n "$EXPECT_BUNDLED" ]; then
    if [ ! -x /opt/kolibri/python/bin/python3 ]; then
      echo "FAIL: expected the bundled interpreter, none installed"
      exit 1
    fi
    if ! /opt/kolibri/python/bin/python3 --version; then
      echo "FAIL: bundled interpreter failed to execute"
      exit 1
    fi
    if ! su -s /bin/sh "$KOLIBRI_USER" -c "/opt/kolibri/python/bin/python3 -c 'import sys'"; then
      echo "FAIL: bundled interpreter cannot be executed by $KOLIBRI_USER"
      exit 1
    fi
    echo "PASS: bundled interpreter installed and runnable"
  else
    if [ -e /opt/kolibri/python ]; then
      echo "FAIL: bundled interpreter installed over a system python3 that meets the minimum"
      exit 1
    fi
    if ! /usr/bin/python3 --version; then
      echo "FAIL: system interpreter failed to execute"
      exit 1
    fi
    echo "PASS: system interpreter kept and runnable"
  fi
}

check_kolibri_cli() {
  echo "Testing kolibri CLI..."
  if ! kolibri --version; then
    echo "FAIL: kolibri --version failed as root"
    exit 1
  fi
  if ! su -s /bin/sh "$KOLIBRI_USER" -c "kolibri --version"; then
    echo "FAIL: kolibri --version failed as $KOLIBRI_USER"
    exit 1
  fi
  echo "PASS: kolibri CLI works"
}

wait_for_kolibri() {
  echo "Waiting for Kolibri to start on port 8080..."
  for i in $(seq 1 60); do
    if curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200\|302"; then
      echo "PASS: Kolibri is responding on port 8080 (attempt $i)"
      return
    fi
    sleep 2
  done
  echo "FAIL: Kolibri did not respond on port 8080 after 60 attempts"
  exit 1
}

check_server_interpreter() {
  exe=$(su -s /bin/sh "$KOLIBRI_USER" -c 'readlink "/proc/$(head -1 ~/.kolibri/server.pid)/exe"' || true)
  if [ -n "$EXPECT_BUNDLED" ]; then
    expected="/opt/kolibri/python/bin/python3.*"
  else
    expected="/usr/bin/python3.*"
  fi
  case "$exe" in
    *" (deleted)") ;;
    $expected)
      echo "PASS: Kolibri server runs on $exe"
      return
      ;;
  esac
  echo "FAIL: Kolibri server runs on '$exe', expected $expected"
  exit 1
}

KOLIBRI_USER=$(cat /etc/kolibri/username 2>/dev/null || echo "kolibri")

check_interpreter
check_kolibri_cli

su -s /bin/sh "$KOLIBRI_USER" -c "kolibri stop" 2>/dev/null || true
su -s /bin/sh "$KOLIBRI_USER" -c "kolibri start"
wait_for_kolibri
check_server_interpreter

# Containers run no service manager; stand in for systemd, which runs
# kolibri.service's ExecStart/ExecStop, i.e. the init script.
printf '#!/bin/sh\ncase "$1" in start|stop) exec /etc/init.d/kolibri "$1" ;; esac\n' \
  > /usr/local/sbin/systemctl
chmod +x /usr/local/sbin/systemctl
if [ -n "$EXPECT_BUNDLED" ]; then
  echo stale > /opt/kolibri/python/.bundled-version
  ( umask 027 && dpkg-reconfigure kolibri )
else
  dpkg-reconfigure kolibri
fi
check_interpreter
check_kolibri_cli
if [ -n "$EXPECT_BUNDLED" ]; then
  if [ "$(cat /opt/kolibri/python/.bundled-version)" = stale ]; then
    echo "FAIL: dpkg-reconfigure did not re-extract over a stale stamp"
    exit 1
  fi
  unreadable=$(find /opt/kolibri/python -type f ! -perm -004)
  if [ -n "$unreadable" ]; then
    echo "FAIL: found files unreadable by others under umask 027: $unreadable"
    exit 1
  fi
fi
wait_for_kolibri
check_server_interpreter

dpkg --purge kolibri
if [ -e /opt/kolibri ]; then
  echo "FAIL: /opt/kolibri survived purge"
  ls -R /opt/kolibri
  exit 1
fi
echo "PASS: purge removed /opt/kolibri"
