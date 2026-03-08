#!/usr/bin/env bash
# Smoke test: verify WiFi AP configuration in a built Kolibri Pi image.
# Usage: sudo ./smoke-test-wifi.sh <path-to-zip-or-img>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <path-to-zip-or-img>" >&2
  exit 1
fi

INPUT="$1"

# If given a ZIP, extract the IMG
if [[ "$INPUT" == *.zip ]]; then
  IMG="${INPUT%.zip}.img"
  unzip -o "$INPUT" -d "$(dirname "$INPUT")"
  EXTRACTED=1
else
  IMG="$INPUT"
  EXTRACTED=0
fi

LOOP=$(sudo losetup --find --show --partscan "$IMG")
MNT=$(mktemp -d)

cleanup() {
  sudo umount "$MNT/boot/firmware" 2>/dev/null || true
  sudo umount "$MNT" 2>/dev/null || true
  sudo losetup -d "$LOOP" 2>/dev/null || true
  rmdir "$MNT" 2>/dev/null || true
  if [ "$EXTRACTED" -eq 1 ]; then
    rm -f "$IMG"
  fi
}
trap cleanup EXIT

sudo mount "${LOOP}p2" "$MNT"
sudo mount "${LOOP}p1" "$MNT/boot/firmware"

fail=0

check_file() {
  local file="$1" pattern="$2" description="$3"
  echo "=== Checking $description ==="
  local content
  content=$(sudo cat "$file") || { echo "FAIL: $file not found"; fail=1; return; }
  echo "$content"
  if echo "$content" | grep -qF "$pattern"; then
    echo "PASS: $description"
  else
    echo "FAIL: $description"
    fail=1
  fi
}

check_file "$MNT/boot/firmware/cmdline.txt" \
  'cfg80211.ieee80211_regdom=US' 'regulatory domain set on kernel cmdline'

check_file "$MNT/etc/modprobe.d/rfkill_default.conf" \
  'default_state=1' 'rfkill default_state=1'

NM_CONN="$MNT/etc/NetworkManager/system-connections/kolibri-hotspot.nmconnection"

check_file "$NM_CONN" \
  'mode=ap' 'NM hotspot profile present with mode=ap'

check_file "$MNT/var/lib/NetworkManager/NetworkManager.state" \
  'WirelessEnabled=true' 'NetworkManager WirelessEnabled=true'

echo "=== Checking NM connection file ownership/permissions ==="
NM_PERMS=$(sudo stat -c '%U:%G %a' "$NM_CONN")
echo "Ownership/perms: $NM_PERMS"
if [ "$NM_PERMS" = "root:root 600" ]; then
  echo "PASS: NM connection file ownership and permissions correct"
else
  echo "FAIL: expected root:root 600, got $NM_PERMS"
  fail=1
fi

echo "=== Checking NetworkManager service is enabled ==="
NM_SYMLINK="$MNT/etc/systemd/system/multi-user.target.wants/NetworkManager.service"
if sudo test -L "$NM_SYMLINK"; then
  echo "PASS: NetworkManager service is enabled"
else
  echo "FAIL: NetworkManager service is not enabled (symlink missing: $NM_SYMLINK)"
  fail=1
fi

echo "=== Checking wpa_supplicant is installed ==="
if sudo test -x "$MNT/usr/sbin/wpa_supplicant"; then
  echo "PASS: wpa_supplicant binary present"
else
  echo "FAIL: wpa_supplicant binary not found (required by NM for WiFi AP mode)"
  fail=1
fi

echo "=== Checking wpa_supplicant D-Bus service file ==="
WPA_DBUS="$MNT/usr/share/dbus-1/system-services/fi.w1.wpa_supplicant1.service"
if sudo test -f "$WPA_DBUS"; then
  echo "PASS: wpa_supplicant D-Bus service file present (NM can activate wpa_supplicant)"
else
  echo "FAIL: wpa_supplicant D-Bus service file missing (NM cannot start wpa_supplicant for AP mode)"
  fail=1
fi

echo "=== Checking hostapd is NOT installed ==="
if sudo test -f "$MNT/etc/hostapd/hostapd.conf"; then
  echo "FAIL: old hostapd.conf still present"
  fail=1
else
  echo "PASS: hostapd.conf removed"
fi

if [ "$fail" -ne 0 ]; then
  echo "SMOKE TEST FAILED: WiFi configuration is incorrect"
  exit 1
fi
echo "All WiFi smoke tests passed."
