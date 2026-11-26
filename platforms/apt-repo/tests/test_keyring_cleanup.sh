#!/bin/sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$HERE/lib.sh"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
export WORK
cat > "$WORK/docker" <<'DOCKER'
#!/bin/sh
set -eu

case "$1 $2" in
  'image inspect') [ "$SCENARIO" != pull ] ;;
  'pull '*)
    [ "$SCENARIO" = pull ]
    touch "$WORK/pull-started"
    kill -TERM "$KEYRING_TEST_PID"
    ;;
  'volume create')
    touch "$WORK/volume-created"
    if [ "$SCENARIO" = volume ]; then
      kill -TERM "$KEYRING_TEST_PID"
      sleep 1
    fi
    [ ! -d "$WORK" ] || mkdir "$WORK/$3"
    ;;
  'volume rm')
    touch "$WORK/volume-remove-attempted"
    [ "$FAIL_VOLUME_RM" != yes ] || exit 42
    rmdir "$WORK/$3" 2>/dev/null
    touch "$WORK/volume-removed"
    ;;
  'start -ai')
    [ "$SCENARIO" != container-failure ] || exit 7
    echo 'PASS: fixture container'
    ;;
  'create -i'|'rm '*) ;;
  *) exit 1 ;;
esac
DOCKER
chmod +x "$WORK/docker"

assert_run_status() {
  rm -f "$WORK/volume-remove-attempted"
  status=0
  SCENARIO="$1" FAIL_VOLUME_RM="$2" PATH="$WORK:$PATH" TMPDIR="$WORK" sh -c '
    export KEYRING_TEST_PID=$$
    exec sh "$1"
  ' sh "$HERE/test_keyring_install.sh" > "$WORK/output" 2>&1 || status=$?
  assert_equals "$status" "$3" "$1 with volume removal failure=$2: expected $3, got $status"
}

assert_run_status pull no 143
assert_file "$WORK/pull-started" "the test did not reach the image pull"
[ ! -e "$WORK/volume-created" ] || fail "the fixture volume was created before the pull completed"
echo "PASS: TERM during image pull leaves no fixture volume"

assert_run_status volume no 143
assert_file "$WORK/volume-removed" "TERM ran cleanup before the fixture volume existed"
echo "PASS: TERM during volume creation removes the fixture volume"

assert_run_status success no 0
assert_run_status success yes 42
assert_file "$WORK/volume-remove-attempted"
echo "PASS: failed volume removal fails an otherwise successful run"

assert_run_status container-failure yes 1
assert_file "$WORK/volume-remove-attempted"
assert_run_status volume yes 143
assert_file "$WORK/volume-remove-attempted"
echo "PASS: failed volume removal preserves failure and cancellation statuses"
