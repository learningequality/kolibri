#!/bin/sh
# Guards the gs:// sync-down guard in publish.sh: a genuinely empty prefix may
# skip the down-leg, but a transient `gcloud storage ls` failure must NOT be
# mistaken for "empty" — otherwise the destructive `-c -d` up-leg wipes the
# live repo. Both cases are driven through a fake `gcloud` on PATH so no real
# GCS access is needed.
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

require_tools reprepro gpg dpkg-deb rsync

PUBLISH="$HERE/../publish.sh"

setup_workdir

# --- fake gcloud on PATH ----------------------------------------------------
# `storage ls`  -> behaviour picked by $FAKE_LS_MODE (empty|transient|objects)
# `storage rsync` -> record the invocation so we can assert whether the up-leg
#                    (the destructive `-c -d` leg) ever ran.
BIN="$WORK/bin"
mkdir -p "$BIN"
RSYNC_LOG="$WORK/gcloud_rsync.log"
cat > "$BIN/gcloud" <<EOF
#!/bin/sh
if [ "\$1" = "storage" ] && [ "\$2" = "ls" ]; then
  case "\${FAKE_LS_MODE:-}" in
    objects)   echo "\$3"; exit 0 ;;
    empty)     echo "ERROR: (gcloud.storage.ls) One or more URLs matched no objects." >&2; exit 1 ;;
    transient) echo "ERROR: (gcloud.storage.ls) HTTPError 503: The service is currently unavailable." >&2; exit 1 ;;
    *)         echo "fake gcloud: FAKE_LS_MODE unset" >&2; exit 99 ;;
  esac
fi
if [ "\$1" = "storage" ] && [ "\$2" = "rsync" ]; then
  echo "rsync \$*" >> "$RSYNC_LOG"
  exit 0
fi
echo "fake gcloud: unhandled args: \$*" >&2
exit 100
EOF
chmod +x "$BIN/gcloud"
PATH="$BIN:$PATH"
export PATH

make_ephemeral_signing_key
export REPREPRO_SIGN_KEY="$FPR"
build_min_deb aaa-test

export KOLIBRI_APT_BUCKET="gs://fake-bucket/apt"

# --- transient failure: must abort before the destructive up-leg ------------
: > "$RSYNC_LOG"
set +e
FAKE_LS_MODE=transient bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb" >"$WORK/transient.out" 2>&1
rc=$?
set -e
[ "$rc" -ne 0 ] || fail "transient ls failure was treated as success (publish.sh exited 0)"
assert_contains "$WORK/transient.out" 'aborting: cannot list' \
  "transient failure did not abort with the guard message"
# The up-leg is the only rsync that would delete state; it must never run.
[ ! -s "$RSYNC_LOG" ] \
  || fail "transient ls failure still reached a gcloud rsync leg: $(cat "$RSYNC_LOG")"

# --- genuinely empty prefix: skip down-leg, still publish + run up-leg -------
: > "$RSYNC_LOG"
FAKE_LS_MODE=empty bash "$PUBLISH" "$WORK/aaa-test_1.0_all.deb" >"$WORK/empty.out" 2>&1 \
  || { cat "$WORK/empty.out"; fail "empty prefix should publish cleanly, not abort"; }
assert_contains "$WORK/empty.out" 'empty prefix' \
  "empty prefix was not detected as a first publish"
assert_contains "$RSYNC_LOG" '^rsync .* -d ' \
  "empty-prefix publish never reached the -d up-leg"

echo "PASS: transient ls failure aborts before the up-leg; empty prefix publishes fresh"
