#!/usr/bin/env python3
"""Behavioural smoke test for the Kolibri GNOME flatpak.

Runs the real app headlessly (virtual X display, private D-Bus, no Wayland) and
asserts the 0.19 app-mode flow from the Kolibri server access log -- the
requests the app's WebKit view actually makes -- plus an HTTP probe:

  1. Fresh first run: a search-only activation leaves Kolibri stopped until
     the app starts; then the app-mode initialize endpoint is hit and the setup
     wizard is reached (exercises the daemon, the 0.19 hooks, and the
     front-end's daemon-provided initialize URL).
  2. Auto-provisioned (landing_page=learn via KOLIBRI_HOME/options.ini): the
     app reaches the learn library, which serves HTTP 200, and the alternate
     (zip content) origin serves a static file over HTTP 200 -- confirming the
     second, app-owned origin bound without needing imported content.
  3. In the same run, the GNOME Shell search provider answers a query, which
     exercises the daemon's in-process calls into Kolibri's content API.
  4. Still in that run: the daemon is one process, the desktop user is signed
     in, Kolibri is registered on zeroconf, and Kolibri comes back after a
     D-Bus Stop and after the daemon is sent SIGTERM.
  5. With a bundle given: an update published while the app runs leaves the
     old daemon serving, the app offers a restart, and restarting runs the app
     and daemon from the new commit.

The log is the signal because headless WebKitGTK does not expose web content
over AT-SPI. A hard SIGALRM timeout guarantees the test can never hang.

Usage: smoke_test.py [BUNDLE.flatpak]   # installs the bundle first if given
"""

import getpass
import json
import os
import re
import shutil
import signal
import socket
import sqlite3
import subprocess
import sys
import time
import urllib.request
from configparser import ConfigParser
from pathlib import Path

APP_ID = "org.learningequality.Kolibri.Devel"
KOLIBRI_HOME = Path.home() / ".var" / "app" / APP_ID / "data" / "kolibri"
KOLIBRI_LOG = KOLIBRI_HOME / "logs" / "kolibri.txt"
PROVISION_FILE = KOLIBRI_HOME / "provision.json"
OPTIONS_FILE = KOLIBRI_HOME / "options.ini"
SMOKE_REPO = Path("/tmp/smoke-repo")

TIMEOUT_S = int(os.environ.get("SMOKE_TIMEOUT", "600"))  # hard cap on the run
PHASE_WAIT_S = 200  # per-phase wait for the expected requests to appear

# Keep CI runs out of the telemetry stats: DISABLE_PING stops the startup
# pingback, and RUN_MODE flags the instance as non-user in case it ever does
# ping. Written into options.ini because the daemon is D-Bus-activated and does
# not inherit the smoke test's environment.
RUN_MODE = "kolibri-gnome-smoketest"


def _free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


# Pin the alternate-origin (zip content) server to a known free port so the test
# can probe it: Kolibri defaults it to a random port, never logs it, and reports
# it only over D-Bus. A static file the origin serves from the content app's
# bundled static dir -- no imported content required -- confirms the second
# origin actually bound and is serving. That origin is the app-owned part of the
# 0.19 integration no other assertion covers.
ZIP_CONTENT_PORT = _free_port()
ZIP_STATIC_URL = (
    f"http://127.0.0.1:{ZIP_CONTENT_PORT}/content/static/bloom/bloomplayer.htm"
)


def _write_options(extra=""):
    KOLIBRI_HOME.mkdir(parents=True, exist_ok=True)
    OPTIONS_FILE.write_text(
        f"[Deployment]\nRUN_MODE = {RUN_MODE}\n"
        f"DISABLE_PING = True\nZIP_CONTENT_PORT = {ZIP_CONTENT_PORT}\n{extra}"
    )


# Auto-provisioning input consumed by Kolibri on startup (landing on the learn
# library). Mirrors the "on my own" wizard outcome without driving the UI.
PROVISION_DATA = {
    "facility_name": "Smoke",
    "preset": "nonformal",
    "device_settings": {
        "language_id": "en",
        "landing_page": "learn",
        "allow_guest_access": True,
        "name": "Smoke Device",
    },
    "superuser": {"username": "smokeadmin", "password": "smokepass123"},
}

_procs = []  # [(name, Popen)] spawned children, for teardown


def _reset_kolibri_home():
    # Each phase needs a clean state, but this wipes real app data -- guard it
    # so it only fires in CI or with explicit opt-in.
    if not (os.environ.get("CI") or os.environ.get("SMOKE_ALLOW_WIPE")):
        raise SystemExit(
            f"Refusing to delete {KOLIBRI_HOME}. Set SMOKE_ALLOW_WIPE=1 to confirm."
        )

    shutil.rmtree(KOLIBRI_HOME, ignore_errors=True)


def _spawn(name, argv):
    with open(f"/tmp/smoke-{name}.log", "wb") as log:
        proc = subprocess.Popen(argv, stdout=log, stderr=subprocess.STDOUT)
    _procs.append((name, proc))
    return proc


def _free_display():
    for n in range(99, 130):
        if not os.path.exists(f"/tmp/.X{n}-lock"):
            return f":{n}"
    raise SystemExit("No free X display")


def start_environment():
    """Bring up a virtual X display and a private D-Bus session."""
    display = _free_display()
    _spawn("xvfb", ["Xvfb", display, "-screen", "0", "1280x1024x24"])
    os.environ["DISPLAY"] = display
    # Drop any inherited Wayland display so the app can't render on a real
    # desktop session instead of our virtual X display.
    os.environ.pop("WAYLAND_DISPLAY", None)
    # kolibri-daemon is D-Bus-activated from a flatpak-exported .service file,
    # so put the flatpak exports on XDG_DATA_DIRS before the private bus starts.
    exports = Path.home() / ".local" / "share" / "flatpak" / "exports" / "share"
    existing = os.environ.get("XDG_DATA_DIRS", "/usr/local/share:/usr/share")
    os.environ["XDG_DATA_DIRS"] = f"{exports}:/var/lib/flatpak/exports/share:{existing}"
    time.sleep(2)

    out = subprocess.check_output(["dbus-launch", "--sh-syntax"], text=True)
    for line in out.splitlines():
        if line.startswith("DBUS_SESSION_BUS_ADDRESS="):
            os.environ["DBUS_SESSION_BUS_ADDRESS"] = (
                line.split("=", 1)[1].strip().strip("';")
            )
        elif line.startswith("DBUS_SESSION_BUS_PID="):
            os.environ["DBUS_SESSION_BUS_PID"] = (
                line.split("=", 1)[1].strip().strip("';")
            )


def teardown():
    kill_app()
    for _name, proc in reversed(_procs):
        proc.terminate()
    pid = os.environ.get("DBUS_SESSION_BUS_PID")
    if pid:
        try:
            os.kill(int(pid), signal.SIGTERM)
        except (ProcessLookupError, ValueError):
            pass
    time.sleep(1)
    for _name, proc in reversed(_procs):
        if proc.poll() is None:
            proc.kill()


def launch_app():
    # --nosocket=wayland keeps the run on our virtual X display, headless and
    # deterministic.
    _spawn("app", ["flatpak", "run", "--nosocket=wayland", APP_ID])


def kill_app():
    subprocess.run(["flatpak", "kill", APP_ID], stderr=subprocess.DEVNULL)
    time.sleep(3)


def _log_text():
    try:
        return KOLIBRI_LOG.read_text(errors="replace")
    except OSError:
        return ""


def _wait_for(predicate, timeout):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(3)
    return False


# Kolibri logs e.g. "Kolibri running on: http://127.0.0.1:45335/" on each start.
SERVER_URL_RE = re.compile(r"Kolibri running on: (http://127\.0\.0\.1:\d+)/")


def _server_url():
    matches = SERVER_URL_RE.findall(_log_text())
    return matches[-1] if matches else None


def _http_ok(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.status == 200
    except Exception:
        return False


def _gdbus_call(name, object_path, method, *args):
    dest = f"{APP_ID}.{name}" if name else APP_ID
    result = subprocess.run(
        [
            "gdbus",
            "call",
            "--session",
            "--dest",
            dest,
            "--object-path",
            "/" + APP_ID.replace(".", "/") + object_path,
            "--method",
            method,
            *args,
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        print(f"  {dest} {method} error: {result.stderr.strip()}", flush=True)
        return None
    return result.stdout.strip()


def _search_provider_answers():
    # The daemon's search handler calls Kolibri's content viewsets in-process,
    # so a Kolibri API change breaks it with no request in the server log. It
    # fails the call rather than returning no results.
    return (
        _gdbus_call(
            "SearchProvider",
            "/SearchProvider",
            "org.gnome.Shell.SearchProvider2.GetInitialResultSet",
            "['kolibri']",
        )
        is not None
    )


def _search_leaves_kolibri_stopped():
    # With no app to call Start, a search-activated daemon must stay at IDLE:
    # neither serving nor registered on zeroconf. Retried because the first
    # activation runs migrations, which can outlast gdbus's call timeout.
    if not _wait_for(_search_provider_answers, PHASE_WAIT_S):
        return False
    # Search answers once Kolibri is initialized, just before its bus enters.
    if not _wait_for(lambda: "Bus state: IDLE" in _log_text(), PHASE_WAIT_S):
        return False
    status = _gdbus_call(
        "Daemon",
        "/Daemon/Main",
        "org.freedesktop.DBus.Properties.Get",
        "org.learningequality.Kolibri.Daemon",
        "Status",
    )
    ok = "STOPPED" in (status or "") and "Bus state: START" not in _log_text()
    if not ok:
        print(f"  daemon Status after search: {status!r}", flush=True)
    return ok


def _pids(pattern):
    result = subprocess.run(["pgrep", "-f", pattern], capture_output=True, text=True)
    return [int(pid) for pid in result.stdout.split()]


def _daemon_pids():
    # setproctitle leaves the daemon's command line as `python3 -m
    # kolibri_daemon.main`; its bwrap wrappers name `kolibri-daemon` instead.
    return _pids(r"kolibri_daemon\.main")


def _frontend_pids():
    return _pids(r"kolibri_gnome\.main")


def _app_commit(pid):
    flatpak_info = ConfigParser()
    try:
        with open(f"/proc/{pid}/root/.flatpak-info") as info:
            flatpak_info.read_file(info)
    except OSError:
        return None
    return flatpak_info.get("Instance", "app-commit", fallback=None)


def _flatpak_info(option):
    return subprocess.check_output(
        ["flatpak", "info", "--user", option, APP_ID], text=True
    ).strip()


def _publish_update():
    # build-commit-from skips a commit whose content is unchanged without --force.
    ref = _flatpak_info("--show-ref")
    subprocess.check_call(
        [
            "flatpak",
            "build-commit-from",
            "--force",
            f"--src-ref={ref}",
            str(SMOKE_REPO),
            ref,
        ]
    )
    subprocess.check_call(["flatpak", "update", "--user", "--noninteractive", APP_ID])
    return _flatpak_info("--show-commit")


def _restart_offered():
    # Describe returns (enabled, parameter type, state), so `((true` is an
    # enabled action.
    description = _gdbus_call("", "", "org.gtk.Actions.Describe", "restart")
    return (description or "").startswith("((true")


def _daemon_is_one_process():
    pids = _daemon_pids()
    if len(pids) != 1:
        print(f"  kolibri-daemon pids: {pids}", flush=True)
        return False
    result = subprocess.run(
        ["pgrep", "-l", "-P", str(pids[0])], capture_output=True, text=True
    )
    if result.stdout:
        print(f"  kolibri-daemon children: {result.stdout.split()}", flush=True)
    return not result.stdout


def _desktop_user_signed_in():
    # The sign-in hook creates this row only once it resolves the app's auth
    # token to the desktop user.
    db = sqlite3.connect(f"file:{KOLIBRI_HOME / 'db.sqlite3'}?mode=ro", uri=True)
    try:
        rows = db.execute("SELECT os_username FROM device_osuser").fetchall()
    finally:
        db.close()
    return (getpass.getuser(),) in rows


def _kolibri_start_count():
    return len(SERVER_URL_RE.findall(_log_text()))


def _kolibri_restarts(name, trigger, settled=lambda: True):
    starts = _kolibri_start_count()
    trigger()
    ok = _wait_for(lambda: _kolibri_start_count() > starts and settled(), PHASE_WAIT_S)
    if not ok:
        print(f"  Kolibri did not restart after {name}", flush=True)
    return ok


def _stop_restarts_kolibri():
    # The app still holds the daemon, so it calls Start once Status is STOPPED.
    return _kolibri_restarts(
        "Stop",
        lambda: _gdbus_call(
            "Daemon", "/Daemon/Main", "org.learningequality.Kolibri.Daemon.Stop"
        ),
    )


def _sigterm_restarts_kolibri():
    # The app calls Start when the name vanishes, activating a new daemon while
    # the old one is still stopping Kolibri.
    pids = _daemon_pids()
    if len(pids) != 1:
        print(f"  kolibri-daemon pids before SIGTERM: {pids}", flush=True)
        return False
    (old_pid,) = pids

    def replaced():
        new_pids = _daemon_pids()
        return len(new_pids) == 1 and new_pids[0] != old_pid

    return _kolibri_restarts(
        "SIGTERM", lambda: os.kill(old_pid, signal.SIGTERM), replaced
    )


def phase_setup():
    """Fresh first run reaches the setup wizard via an app-mode session."""
    print("PHASE 1: first-run setup wizard", flush=True)
    _reset_kolibri_home()
    _write_options()
    # Before the app, so the app's Start then reaches this search-activated
    # daemon.
    search_stopped = _search_leaves_kolibri_stopped()
    print(
        f"  search-only activation left Kolibri stopped: {search_stopped}", flush=True
    )
    launch_app()

    def ready():
        log = _log_text()
        # The front-end fetches the daemon-provided app-mode initialize URL,
        # then the setup wizard page renders.
        return "GET /api/device/initialize/" in log and "/en/setup/" in log

    ok = _wait_for(ready, PHASE_WAIT_S)
    print(f"  app-mode initialize + setup wizard reached: {ok}", flush=True)
    kill_app()
    return search_stopped and ok


def phase_learn():
    """Auto-provisioned run boots into the app and serves the learn library."""
    print("PHASE 2: provisioned app + learn library", flush=True)
    _reset_kolibri_home()
    _write_options(f"[Paths]\nAUTOMATIC_PROVISION_FILE = {PROVISION_FILE}\n")
    PROVISION_FILE.write_text(json.dumps(PROVISION_DATA))
    launch_app()

    # The app's web view (Safari UA, not our urllib probe) reaches an
    # authenticated page once provisioned. Either route confirms first-run is
    # complete (an app-mode admin lands on device, a learner on learn).
    into_app = re.compile(r'"GET /en/(device|learn)/[^"]*".*Safari')

    def ready():
        return not PROVISION_FILE.exists() and bool(into_app.search(_log_text()))

    ok = _wait_for(ready, PHASE_WAIT_S)
    url = _server_url()
    served = bool(url) and _http_ok(url + "/en/learn/")
    checks = {
        "into-app": ok,
        "learn-served-200": served,
        # The alternate origin binds during the same startup as the main server,
        # so once learn is served it is already up: a single probe of a static
        # file it serves without imported content confirms the second origin
        # bound.
        "zip-origin-served-200": _http_ok(ZIP_STATIC_URL),
        "search-provider-answered": _search_provider_answers(),
        # After search, so a search worker process would already exist.
        "one-process": _daemon_is_one_process(),
        "signed-in": _desktop_user_signed_in(),
        # ZeroConfPlugin logs this at RUN, which a bus held at START never reaches.
        "zeroconf-registered": _wait_for(
            lambda: "Registering ourselves to zeroconf network" in _log_text(),
            PHASE_WAIT_S,
        ),
        "stop-restarted": _stop_restarts_kolibri(),
        # Last, because it replaces the daemon.
        "sigterm-restarted": _sigterm_restarts_kolibri(),
    }
    print(
        f"  provisioned={not PROVISION_FILE.exists()} "
        + " ".join(f"{name}={passed}" for name, passed in checks.items()),
        flush=True,
    )
    kill_app()
    return all(checks.values())


def phase_update():
    """An update while the app runs is offered as a restart onto the new commit."""
    print("PHASE 3: update while the app runs", flush=True)
    _reset_kolibri_home()
    _write_options()
    launch_app()

    serving = _wait_for(
        lambda: "GET /api/device/initialize/" in _log_text(), PHASE_WAIT_S
    )
    daemon_pids = _daemon_pids()
    if not serving or len(daemon_pids) != 1:
        print(f"  serving={serving} kolibri-daemon pids: {daemon_pids}", flush=True)
        kill_app()
        return False
    (old_daemon,) = daemon_pids
    old_commit = _app_commit(old_daemon)
    new_commit = _publish_update()

    def on_new_commit():
        frontend_commits = [_app_commit(pid) for pid in _frontend_pids()]
        daemon_commits = [_app_commit(pid) for pid in _daemon_pids()]
        return frontend_commits == daemon_commits == [new_commit]

    checks = {
        "commit-changed": old_commit is not None and new_commit != old_commit,
        "restart-offered": _wait_for(_restart_offered, PHASE_WAIT_S),
        # After restart-offered, so the daemon has had time to see the update.
        "old-daemon-kept": old_daemon in _daemon_pids(),
        "restarted-on-new-commit": _kolibri_restarts(
            "restart",
            lambda: _gdbus_call(
                "", "", "org.gtk.Actions.Activate", "restart", "[]", "{}"
            ),
            on_new_commit,
        ),
    }
    print(
        "  " + " ".join(f"{name}={passed}" for name, passed in checks.items()),
        flush=True,
    )
    kill_app()
    return all(checks.values())


def main():
    bundle = sys.argv[1] if len(sys.argv) > 1 else None

    def on_timeout(signum, frame):
        raise TimeoutError(f"smoke test exceeded {TIMEOUT_S}s")

    signal.signal(signal.SIGALRM, on_timeout)
    signal.alarm(TIMEOUT_S)

    installed = bool(bundle) and Path(bundle).is_file()
    setup_ok = learn_ok = False
    update_ok = not installed
    try:
        if installed:
            print(f"Installing {bundle}", flush=True)
            # Uninstall first so a re-run with the same bundle commit doesn't
            # fail with "already installed".
            subprocess.run(
                ["flatpak", "uninstall", "--user", "--noninteractive", APP_ID],
                stderr=subprocess.DEVNULL,
            )
            # Installed from a local repo, so phase 3 can publish an update to it.
            # build-import-bundle refuses a repo that doesn't exist yet.
            shutil.rmtree(SMOKE_REPO, ignore_errors=True)
            for argv in (
                ["ostree", "init", "--mode=archive", f"--repo={SMOKE_REPO}"],
                ["flatpak", "build-import-bundle", str(SMOKE_REPO), bundle],
                [
                    "flatpak",
                    "remote-add",
                    "--user",
                    "--if-not-exists",
                    "--no-gpg-verify",
                    "smoke-repo",
                    f"file://{SMOKE_REPO}",
                ],
                [
                    "flatpak",
                    "install",
                    "--user",
                    "--noninteractive",
                    "smoke-repo",
                    APP_ID,
                ],
            ):
                subprocess.check_call(argv)

        start_environment()
        setup_ok = phase_setup()
        learn_ok = phase_learn()
        if installed:
            update_ok = phase_update()
        else:
            print("PHASE 3 skipped: pass BUNDLE.flatpak to run it", flush=True)
    except TimeoutError as exc:
        print(f"timed out: {exc}", flush=True)
    finally:
        signal.alarm(0)
        teardown()

    if setup_ok and learn_ok and update_ok:
        print(
            "SMOKE TEST PASSED: setup wizard, learn library and update restart phases."
        )
        return 0

    print("SMOKE TEST FAILED. Recent Kolibri log:")
    print("\n".join(_log_text().splitlines()[-40:]))
    return 1


if __name__ == "__main__":
    sys.exit(main())
