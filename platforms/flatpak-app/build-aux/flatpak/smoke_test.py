#!/usr/bin/env python3
"""Behavioural smoke test for the Kolibri GNOME flatpak.

Runs the real app headlessly (virtual X display, private D-Bus, no Wayland) and
asserts the 0.19 app-mode flow from the Kolibri server access log -- the
requests the app's WebKit view actually makes -- plus an HTTP probe:

  1. Fresh first run: the app-mode initialize endpoint is hit and the setup
     wizard is reached (exercises the daemon, the 0.19 hooks, and the
     front-end's daemon-provided initialize URL).
  2. Auto-provisioned (landing_page=learn via KOLIBRI_HOME/options.ini): the
     app reaches the learn library, which serves HTTP 200, and the alternate
     (zip content) origin serves a static file over HTTP 200 -- confirming the
     second, app-owned origin bound without needing imported content.

The log is the signal because headless WebKitGTK does not expose web content
over AT-SPI. A hard SIGALRM timeout guarantees the test can never hang.

Usage: smoke_test.py [BUNDLE.flatpak]   # installs the bundle first if given
"""
import json
import os
import re
import signal
import socket
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

APP_ID = "org.learningequality.Kolibri.Devel"
KOLIBRI_HOME = Path.home() / ".var" / "app" / APP_ID / "data" / "kolibri"
KOLIBRI_LOG = KOLIBRI_HOME / "logs" / "kolibri.txt"
PROVISION_FILE = KOLIBRI_HOME / "provision.json"
OPTIONS_FILE = KOLIBRI_HOME / "options.ini"

TIMEOUT_S = int(os.environ.get("SMOKE_TIMEOUT", "420"))  # hard cap on the run
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
    import shutil

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


def _server_url():
    # Kolibri logs e.g. "Kolibri running on: http://127.0.0.1:45335/".
    matches = re.findall(r"Kolibri running on: (http://127\.0\.0\.1:\d+)/", _log_text())
    return matches[-1] if matches else None


def _http_ok(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return response.status == 200
    except Exception:
        return False


def phase_setup():
    """Fresh first run reaches the setup wizard via an app-mode session."""
    print("PHASE 1: first-run setup wizard", flush=True)
    _reset_kolibri_home()
    _write_options()
    launch_app()

    def ready():
        log = _log_text()
        # The front-end fetches the daemon-provided app-mode initialize URL,
        # then the setup wizard page renders.
        return "GET /api/device/initialize/" in log and "/en/setup/" in log

    ok = _wait_for(ready, PHASE_WAIT_S)
    print(f"  app-mode initialize + setup wizard reached: {ok}", flush=True)
    kill_app()
    return ok


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
    # The alternate origin binds during the same startup as the main server, so
    # once learn is served it is already up: a single probe of a static file it
    # serves without imported content confirms the second origin bound.
    zip_served = _http_ok(ZIP_STATIC_URL)
    print(
        f"  provisioned={not PROVISION_FILE.exists()} into-app={ok} "
        f"learn-served-200={served} zip-origin-served-200={zip_served}",
        flush=True,
    )
    kill_app()
    return ok and served and zip_served


def main():
    bundle = sys.argv[1] if len(sys.argv) > 1 else None

    def on_timeout(signum, frame):
        raise TimeoutError(f"smoke test exceeded {TIMEOUT_S}s")

    signal.signal(signal.SIGALRM, on_timeout)
    signal.alarm(TIMEOUT_S)

    setup_ok = learn_ok = False
    try:
        if bundle and Path(bundle).is_file():
            print(f"Installing {bundle}", flush=True)
            # Uninstall first so a re-run with the same bundle commit doesn't
            # fail with "already installed".
            subprocess.run(
                ["flatpak", "uninstall", "--user", "--noninteractive", APP_ID],
                stderr=subprocess.DEVNULL,
            )
            subprocess.check_call(
                ["flatpak", "install", "--user", "--noninteractive", "--bundle", bundle]
            )

        start_environment()
        setup_ok = phase_setup()
        learn_ok = phase_learn()
    except TimeoutError as exc:
        print(f"timed out: {exc}", flush=True)
    finally:
        signal.alarm(0)
        teardown()

    if setup_ok and learn_ok:
        print("SMOKE TEST PASSED: setup wizard and learn library both reached.")
        return 0

    print("SMOKE TEST FAILED. Recent Kolibri log:")
    print("\n".join(_log_text().splitlines()[-40:]))
    return 1


if __name__ == "__main__":
    sys.exit(main())
