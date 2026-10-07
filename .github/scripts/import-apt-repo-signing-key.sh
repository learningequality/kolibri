#!/usr/bin/env bash
# Import the APT repo signing key into a fresh GNUPGHOME for a GitHub Actions job.
#
# Env: DEBIAN_REPO_SIGNING_KEY (armored secret key).
# Exports GNUPGHOME via $GITHUB_ENV and the key fingerprint as step output key-id.
set -euo pipefail

: "${DEBIAN_REPO_SIGNING_KEY:?DEBIAN_REPO_SIGNING_KEY must be set}"

# Same key, keyring layout and loopback pinentry as the retired Pages
# repos' workflows.
GNUPGHOME=$(mktemp -d)
export GNUPGHOME
echo "GNUPGHOME=$GNUPGHOME" >> "$GITHUB_ENV"
echo "pinentry-mode loopback" > "$GNUPGHOME/gpg.conf"
echo "allow-loopback-pinentry" > "$GNUPGHOME/gpg-agent.conf"
printf '%s\n' "$DEBIAN_REPO_SIGNING_KEY" | gpg --batch --import
# The repo must be signed by the key kolibri-archive-keyring ships, or no
# client trusting that keyring can verify it. Take the key id from the
# committed key and require the imported secret key to match.
GPG_KEY_ID=$(gpg --show-keys --with-colons platforms/apt-repo/keyring/kolibri-archive-keyring.asc | awk -F: '/^fpr:/ {print $10; exit}')
gpg --list-secret-keys "$GPG_KEY_ID" >/dev/null 2>&1 || {
  echo "::error::DEBIAN_REPO_SIGNING_KEY does not hold $GPG_KEY_ID, the key shipped in kolibri-archive-keyring.asc"
  exit 1
}
echo "$GPG_KEY_ID:6:" | gpg --batch --import-ownertrust
echo "key-id=$GPG_KEY_ID" >> "$GITHUB_OUTPUT"
