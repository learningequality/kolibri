#!/bin/bash
#
# Installs /tmp/deb/*.deb inside a bare Ubuntu container and checks it runs.
# Run by .github/workflows/platform-debian-install_test.yml; locally:
#
#   docker run --rm --sysctl net.ipv4.ip_unprivileged_port_start=1024 \
#     -v "$PWD/dist:/tmp/deb" -v "$PWD/tests:/tmp/tests" \
#     -e EXPECT_BUNDLED=1 ubuntu:20.04 /tmp/tests/install_smoke_test.sh
#
# Environment:
#   EXPECT_BUNDLED     non-empty if postinst must install /opt/kolibri/python
#   NO_SYSTEM_PYTHON   non-empty to install with no python3 at all
#   UPGRADE_FROM_DEB   URL of an earlier .deb to install first, then upgrade
#   NO_AMBIENT_CAPS    non-empty if the image's setpriv cannot raise ambient caps
#   PRESEED_HTTP_PORT  KOLIBRI_HTTP_PORT to write to /etc/kolibri/conf.d before install
#   SERVICE_DISABLED   non-empty to preseed kolibri/init false before install

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

if [ -n "$PRESEED_HTTP_PORT" ]; then
  mkdir -p /etc/kolibri/conf.d
  echo "KOLIBRI_HTTP_PORT=$PRESEED_HTTP_PORT" > /etc/kolibri/conf.d/http-port.conf
fi
if [ -n "$SERVICE_DISABLED" ]; then
  echo "kolibri kolibri/init boolean false" | debconf-set-selections
fi

if [ -n "$UPGRADE_FROM_DEB" ]; then
  curl -fsSL -o /tmp/previous.deb "$UPGRADE_FROM_DEB"
  dpkg -i /tmp/previous.deb || true
  apt-get install -f -y $APT_OPTS
  echo "Installed kolibri $(dpkg-query -W -f='${Version}' kolibri) from $UPGRADE_FROM_DEB"
  su -s /bin/sh "$(cat /etc/kolibri/username)" -c "kolibri configure setup"
  GITHUB_IO_SOURCE=/etc/apt/sources.list.d/kolibri-github-io.list
  PPA_SOURCE=/etc/apt/sources.list.d/kolibri-ppa.list
  echo "deb https://learningequality.github.io/kolibri-installer-debian stable main" > "$GITHUB_IO_SOURCE"
  echo "deb http://ppa.launchpadcontent.net/learningequality/kolibri/ubuntu focal main" > "$PPA_SOURCE"
  cp "$PPA_SOURCE" /tmp/ppa-source.orig
fi

# dpkg -i cannot resolve dependencies; apt-get -f installs them
# and dpkg --configure completes the deferred configuration
dpkg -i /tmp/deb/*.deb || true
apt-get install -f -y $APT_OPTS
dpkg --configure -a
dpkg-query -s kolibri | grep -q "^Status: install ok installed$"

if [ -n "$UPGRADE_FROM_DEB" ]; then
  if ! grep -q "^deb https://apt.learningequality.org stable main$" "$GITHUB_IO_SOURCE"; then
    echo "FAIL: upgrade did not migrate the github.io source: $(cat "$GITHUB_IO_SOURCE")"
    exit 1
  fi
  if ! cmp -s /tmp/ppa-source.orig "$PPA_SOURCE"; then
    echo "FAIL: upgrade modified the Launchpad PPA source: $(cat "$PPA_SOURCE")"
    exit 1
  fi
  echo "PASS: upgrade migrated the github.io source and left the PPA source alone"
fi

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
  echo "Waiting for Kolibri to start on port $EXPECTED_PORT..."
  for i in $(seq 1 60); do
    if curl -s --max-time 5 -o /dev/null -w "%{http_code}" "http://localhost:$EXPECTED_PORT" | grep -q "200\|302"; then
      echo "PASS: Kolibri is responding on port $EXPECTED_PORT (attempt $i)"
      return
    fi
    sleep 2
  done
  echo "FAIL: Kolibri did not respond on port $EXPECTED_PORT after 60 attempts"
  exit 1
}

server_pid() {
  head -1 "$KOLIBRI_HOME/server.pid"
}

check_elected_port() {
  options="$KOLIBRI_HOME/options.ini"
  pinned=$(sed -n 's/^[[:space:]]*HTTP_PORT[[:space:]]*=[[:space:]]*//p' "$options")
  if [ "$pinned" != "$EXPECTED_PIN" ]; then
    echo "FAIL: $options pins HTTP_PORT '$pinned', expected '$EXPECTED_PIN'"
    exit 1
  fi
  echo "PASS: $options pins HTTP_PORT '$pinned'"
}

check_server_interpreter() {
  exe=$(run_as_kolibri_user "readlink /proc/$(server_pid)/exe" || true)
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

check_server_privileges() {
  status="/proc/$(server_pid)/status"
  uid=$(id -u "$KOLIBRI_USER")
  uids=$(awk '/^Uid:/ {print $2, $3, $4, $5}' "$status")
  if [ "$uids" != "$uid $uid $uid $uid" ]; then
    echo "FAIL: Kolibri server runs with real/effective/saved/fs uids $uids, expected $KOLIBRI_USER ($uid)"
    exit 1
  fi
  gid=$(id -g "$KOLIBRI_USER")
  gids=$(awk '/^Gid:/ {print $2, $3, $4, $5}' "$status")
  if [ "$gids" != "$gid $gid $gid $gid" ]; then
    echo "FAIL: Kolibri server runs with real/effective/saved/fs gids $gids, expected $KOLIBRI_USER's group ($gid)"
    exit 1
  fi
  echo "PASS: Kolibri server runs as $KOLIBRI_USER"
  if [ -n "$NO_AMBIENT_CAPS" ]; then
    echo "SKIP: setpriv on this image cannot raise ambient capabilities"
    return
  fi
  cap_amb=$(awk '/^CapAmb:/ {print $2}' "$status")
  # Bit 10 is CAP_NET_BIND_SERVICE in linux/capability.h
  if (( (0x$cap_amb >> 10) & 1 )); then
    echo "PASS: Kolibri server holds CAP_NET_BIND_SERVICE as an ambient capability"
  else
    echo "FAIL: Kolibri server lacks ambient CAP_NET_BIND_SERVICE (CapAmb: $cap_amb)"
    exit 1
  fi
}

check_running_server() {
  wait_for_kolibri
  check_elected_port
  check_server_interpreter
  check_server_privileges
}

KOLIBRI_USER=$(cat /etc/kolibri/username 2>/dev/null || echo "kolibri")
KOLIBRI_HOME=$(. /etc/default/kolibri && echo "$KOLIBRI_HOME")
. /usr/share/kolibri/run-as-kolibri-user.sh

if [ -n "$SERVICE_DISABLED" ]; then
  if [ -e "$KOLIBRI_HOME/options.ini" ]; then
    echo "FAIL: postinst ran kolibri configure setup with the service disabled"
    exit 1
  fi
  echo "PASS: postinst left the Kolibri home alone with the service disabled"
fi

if [ -n "$PRESEED_HTTP_PORT$UPGRADE_FROM_DEB$SERVICE_DISABLED" ]; then
  EXPECTED_PIN=
elif [ -n "$NO_AMBIENT_CAPS" ]; then
  EXPECTED_PIN=8080
else
  EXPECTED_PIN=80
fi
EXPECTED_PORT=${EXPECTED_PIN:-${PRESEED_HTTP_PORT:-8080}}

check_interpreter
check_kolibri_cli

/etc/init.d/kolibri stop 2>/dev/null || true
/etc/init.d/kolibri start
check_running_server

# Containers run no service manager; stand in for systemd, which runs
# kolibri.service's ExecStart/ExecStop, i.e. the init script.
printf '#!/bin/sh\ncase "$1" in start|stop) exec /etc/init.d/kolibri "$1" ;; esac\n' \
  > /usr/local/sbin/systemctl
chmod +x /usr/local/sbin/systemctl
/etc/init.d/kolibri stop
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
if [ -n "$SERVICE_DISABLED" ]; then
  /etc/init.d/kolibri start
fi
check_running_server

dpkg --purge kolibri
if [ -e /opt/kolibri ]; then
  echo "FAIL: /opt/kolibri survived purge"
  ls -R /opt/kolibri
  exit 1
fi
echo "PASS: purge removed /opt/kolibri"
