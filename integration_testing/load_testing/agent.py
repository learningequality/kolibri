#!/usr/bin/env python3
import argparse
import json
import os
import platform
import shutil
import socket
import subprocess
import sys
import tarfile
import time
import traceback
from urllib import request
from urllib.error import HTTPError
from urllib.error import URLError

BASE = os.path.expanduser(os.path.join("~", ".kolibri_bench"))
VENVS = os.path.join(BASE, "venvs")
TEMPLATE = os.path.join(BASE, "template")
RUN_HOME = os.path.join(BASE, "run_home")
DOWNLOADS = os.path.join(BASE, "downloads")
HASH_FILE = os.path.join(BASE, "template.hash")
SERVER_LOG = os.path.join(BASE, "server.log")
POLL_TIMEOUT = 40
RETRY_DELAY = 5

EMBEDDED_HUB_URL = None
EMBEDDED_TOKEN = None


def log(message):
    print(f"[agent] {message}", flush=True)  # noqa: T201


def kolibri_bin(venv):
    if os.name == "nt":
        return os.path.join(venv, "Scripts", "kolibri.exe")
    return os.path.join(venv, "bin", "kolibri")


def venv_python(venv):
    if os.name == "nt":
        return os.path.join(venv, "Scripts", "python.exe")
    return os.path.join(venv, "bin", "python")


def download(url, dest, token):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = request.Request(url, headers={"X-Bench-Token": token})
    with request.urlopen(req, timeout=600) as resp, open(dest, "wb") as f:
        shutil.copyfileobj(resp, f)
    return dest


def tail(path, lines=50):
    if not os.path.exists(path):
        return f"(no log at {path})"
    with open(path, "rb") as f:
        return b"\n".join(f.read().splitlines()[-lines:]).decode("utf-8", "replace")


def port_in_use(port):
    try:
        socket.create_connection(("127.0.0.1", int(port)), timeout=2).close()
        return True
    except OSError:
        return False


def run_checked(cmd, what, **kwargs):
    proc = subprocess.run(
        cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, **kwargs
    )
    if proc.returncode != 0:
        raise RuntimeError(
            "{} failed:\n{}".format(what, proc.stdout.decode("utf-8", "replace"))
        )


def prune_subdirs(parent, keep):
    if not os.path.isdir(parent):
        return
    for name in os.listdir(parent):
        if name == keep:
            continue
        path = os.path.join(parent, name)
        if os.path.isdir(path):
            log(f"pruning {path}")
            shutil.rmtree(path, ignore_errors=True)


class Agent(object):
    def __init__(self, hub_url, token):
        self.hub_url = hub_url.rstrip("/")
        self.token = token
        self.device = None
        self.server = None
        self._server_log = None

    def _request(self, path, payload=None, timeout=POLL_TIMEOUT):
        data = json.dumps(payload).encode() if payload is not None else None
        req = request.Request(
            self.hub_url + path,
            data=data,
            headers={
                "Content-Type": "application/json",
                "X-Bench-Token": self.token,
            },
        )
        with request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            return resp.status, json.loads(body) if body else None

    def register(self):
        _, body = self._request(
            "/register",
            {
                "hostname": socket.gethostname(),
                "platform": platform.platform(),
                "python": platform.python_version(),
                "cpus": os.cpu_count(),
            },
        )
        self.device = body["device"]
        log(f"registered as '{self.device}'")

    def run_forever(self):
        self.register()
        while True:
            try:
                status, command = self._request(f"/poll?device={self.device}")
            except HTTPError as e:
                if e.code == 410:
                    log("hub no longer knows us; re-registering")
                    self.register()
                    continue
                log(f"poll error {e.code}; retrying in {RETRY_DELAY}s")
                time.sleep(RETRY_DELAY)
                continue
            except (URLError, OSError):
                log(f"hub unreachable; retrying in {RETRY_DELAY}s")
                time.sleep(RETRY_DELAY)
                continue
            if status != 200 or command is None:
                continue
            log("command: {}".format(command["action"]))
            result = self.execute(command)
            result["id"] = command["id"]
            try:
                self._request(f"/result?device={self.device}", result)
            except (URLError, OSError):
                log("could not report result; hub will time the command out")

    def execute(self, command):
        handler = getattr(self, "do_" + command["action"].replace("-", "_"), None)
        if handler is None:
            return {
                "ok": False,
                "detail": "unknown action '{}'".format(command["action"]),
            }
        try:
            return handler(command.get("params") or {})
        except Exception:
            return {"ok": False, "detail": traceback.format_exc()}

    def do_install(self, params):
        sha, url = params["sha"], params["url"]
        venv = os.path.join(VENVS, sha)
        if os.path.exists(kolibri_bin(venv)):
            return {"ok": True, "detail": "venv cached"}
        prune_subdirs(VENVS, sha)
        prune_subdirs(DOWNLOADS, sha)
        # pip refuses a wheel whose filename is not a valid PEP 427 name.
        wheel_dir = os.path.join(DOWNLOADS, sha)
        wheel = download(url, os.path.join(wheel_dir, params["filename"]), self.token)
        if os.path.exists(venv):
            shutil.rmtree(venv)
        run_checked([sys.executable, "-m", "venv", venv], "venv creation")
        run_checked(
            [venv_python(venv), "-m", "pip", "install", wheel],
            "pip install",
        )
        shutil.rmtree(wheel_dir)
        return {"ok": True, "detail": "installed"}

    def do_seed_template(self, params):
        wanted = params["hash"]
        if os.path.exists(HASH_FILE):
            with open(HASH_FILE) as f:
                if f.read() == wanted and os.path.isdir(TEMPLATE):
                    return {"ok": True, "detail": "template cached"}
        tarball = download(
            params["url"], os.path.join(DOWNLOADS, "template.tar.gz"), self.token
        )
        staging = TEMPLATE + ".staging"
        if os.path.exists(staging):
            shutil.rmtree(staging)
        os.makedirs(staging)
        with tarfile.open(tarball, "r:gz") as tar:
            tar.extractall(staging)
        if os.path.exists(HASH_FILE):
            os.remove(HASH_FILE)
        if os.path.exists(TEMPLATE):
            shutil.rmtree(TEMPLATE)
        os.rename(staging, TEMPLATE)
        with open(HASH_FILE, "w") as f:
            f.write(wanted)
        return {"ok": True, "detail": "template seeded"}

    def do_reset_home(self, params):
        if not os.path.isdir(TEMPLATE):
            return {"ok": False, "detail": "no template seeded yet"}
        if os.path.exists(RUN_HOME):
            shutil.rmtree(RUN_HOME)
        if os.name != "nt":
            proc = subprocess.run(
                ["cp", "-a", "--reflink=auto", TEMPLATE, RUN_HOME],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
            )
            if proc.returncode == 0:
                return {"ok": True, "detail": "home reset"}
            shutil.rmtree(RUN_HOME, ignore_errors=True)
        shutil.copytree(TEMPLATE, RUN_HOME)
        return {"ok": True, "detail": "home reset"}

    def _close_log(self):
        if self._server_log is not None:
            self._server_log.close()
            self._server_log = None

    def _terminate_server(self, timeout):
        if self.server is not None:
            self.server.terminate()
            try:
                self.server.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                self.server.kill()
                self.server.wait()
            self.server = None
        self._close_log()

    def do_start(self, params):
        if self.server is not None and self.server.poll() is None:
            return {"ok": False, "detail": "server already running; stop it first"}
        venv = os.path.join(VENVS, params["sha"])
        port = str(params["port"])
        if port_in_use(port):
            return {
                "ok": False,
                "detail": f"port {port} is already in use by another process",
            }
        env = dict(os.environ)
        env["KOLIBRI_HOME"] = RUN_HOME
        env.pop("KOLIBRI_RUN_MODE", None)
        self._close_log()
        self._server_log = open(SERVER_LOG, "wb")  # noqa: SIM115
        self.server = subprocess.Popen(
            [kolibri_bin(venv), "start", "--foreground", "--port", port],
            env=env,
            stdout=self._server_log,
            stderr=subprocess.STDOUT,
        )
        deadline = time.time() + 300
        url = f"http://127.0.0.1:{port}/api/public/info/"
        while time.time() < deadline:
            if self.server.poll() is not None:
                self._close_log()
                return {
                    "ok": False,
                    "detail": "kolibri exited; log tail:\n" + tail(SERVER_LOG),
                }
            try:
                with request.urlopen(url, timeout=5) as resp:
                    info = json.loads(resp.read())
                if info.get("application") != "kolibri":
                    self._terminate_server(30)
                    return {
                        "ok": False,
                        "detail": f"a non-kolibri server is answering on port {port}",
                    }
                return {
                    "ok": True,
                    "detail": "serving kolibri {} on port {}".format(
                        info.get("kolibri_version"), port
                    ),
                }
            except (URLError, OSError, ValueError):
                time.sleep(2)
        self._terminate_server(30)
        return {
            "ok": False,
            "detail": "server did not come up; log tail:\n" + tail(SERVER_LOG),
        }

    def do_stop(self, params):
        if self.server is None or self.server.poll() is not None:
            self._close_log()
            self.server = None
            return {"ok": True, "detail": "no server running"}
        self._terminate_server(60)
        return {"ok": True, "detail": "stopped"}

    def do_status(self, params):
        running = self.server is not None and self.server.poll() is None
        return {
            "ok": True,
            "detail": json.dumps(
                {"server_running": running, "platform": platform.platform()}
            ),
        }


def main():
    parser = argparse.ArgumentParser(description="Kolibri bench device agent")
    parser.add_argument("hub_url", nargs="?", default=EMBEDDED_HUB_URL)
    parser.add_argument("--token", default=EMBEDDED_TOKEN)
    args = parser.parse_args()
    if not args.hub_url or not args.token:
        parser.error("hub_url and --token are required")
    for directory in (BASE, VENVS, DOWNLOADS):
        os.makedirs(directory, exist_ok=True)
    agent = Agent(args.hub_url, args.token)
    while True:
        try:
            agent.run_forever()
        except (URLError, OSError):
            log(f"lost hub; retrying in {RETRY_DELAY}s")
            time.sleep(RETRY_DELAY)


if __name__ == "__main__":
    main()
