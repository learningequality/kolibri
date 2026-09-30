import os
import shutil
import subprocess
import sys
import time
import urllib.request
from typing import ClassVar

import click
from logger import info

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
THIS_WORKTREE = os.path.dirname(os.path.dirname(THIS_DIR))
VENVS_DIR = os.path.join(THIS_DIR, "generated", "venvs")
CORE_STATIC = os.path.join("kolibri", "core", "static", "kolibri.core.default_frontend")
DEFAULT_RUN_HOME = os.path.expanduser("~/.kolibri_bench_run")


def _run(cmd, **kwargs):
    result = subprocess.run(cmd, **kwargs)
    if result.returncode != 0:
        raise click.ClickException(f"Command failed: {' '.join(cmd)}")
    return result


def wait_for_server(server_url, timeout=300):
    deadline = time.time() + timeout
    url = f"{server_url}/api/public/info/"
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=5):
                return
        except OSError:
            time.sleep(2)
    raise click.ClickException(f"Server did not come up at {server_url}")


def _swap_editable(worktree):
    info(f"Pointing editable kolibri install at {worktree}")
    _run(
        ["uv", "pip", "install", "-e", worktree, "--python", sys.executable],
        capture_output=True,
    )


def _check_assets_match_version(worktree):
    # `python -c` puts cwd on sys.path, where a kolibri source tree would
    # shadow the editable install.
    version = subprocess.run(
        [sys.executable, "-c", "import kolibri; print(kolibri.__version__)"],
        capture_output=True,
        text=True,
        cwd="/",
        check=True,
    ).stdout.strip()
    static_dir = os.path.join(worktree, CORE_STATIC)
    if not any(version in filename for filename in os.listdir(static_dir)):
        raise click.ClickException(
            f"{worktree} reports version {version} but has no built assets for "
            "it - run `pnpm build` in that worktree (its HEAD has moved since "
            "the last build)"
        )
    return version


def _check_port_free(port):
    result = subprocess.run(["ss", "-ltnp"], capture_output=True, text=True)
    for line in result.stdout.splitlines():
        if f":{port} " in line:
            raise click.ClickException(
                f"Port {port} is already in use - stop or kill the stale "
                f"server first: {line.strip()}"
            )


class LocalExecutor:
    def __init__(self, port, run_home=DEFAULT_RUN_HOME, template_dir=None):
        self.port = str(port)
        self.run_home = run_home
        self.template_dir = template_dir
        self._kolibri_bin = None
        self._dev_mode = False
        self._swapped_editable = False

    @property
    def server_url(self):
        return f"http://localhost:{self.port}"

    def _venv_dir(self, wheel_sha):
        return os.path.join(VENVS_DIR, wheel_sha)

    def prepare(self, target):
        if target.is_dev:
            _swap_editable(target.source)
            self._swapped_editable = True
            version = _check_assets_match_version(target.source)
            info(f"Dev target version {version}, assets OK")
            self._kolibri_bin = os.path.join(os.path.dirname(sys.executable), "kolibri")
            self._dev_mode = True
            return
        sha = target.wheel_sha
        venv = self._venv_dir(sha)
        kolibri = os.path.join(venv, "bin", "kolibri")
        if not os.path.exists(kolibri):
            info(f"Creating venv for {os.path.basename(target.wheel)}...")
            if os.path.exists(venv):
                shutil.rmtree(venv)
            _run([sys.executable, "-m", "venv", venv], capture_output=True)
            _run(
                [os.path.join(venv, "bin", "pip"), "install", target.wheel],
                capture_output=True,
            )
        self._kolibri_bin = kolibri
        self._dev_mode = False

    def seed_template(self, tarball=None, content_hash=None):
        pass

    def reset_home(self):
        if not self.template_dir or not os.path.isdir(self.template_dir):
            raise click.ClickException(
                f"No template at '{self.template_dir}' - cannot reset the run home"
            )
        _run(["rm", "-rf", self.run_home])
        _run(["cp", "-a", "--reflink=auto", self.template_dir, self.run_home])

    def _env(self):
        env = {**os.environ, "KOLIBRI_HOME": self.run_home}
        if self._dev_mode:
            env["KOLIBRI_RUN_MODE"] = "dev"
        else:
            env.pop("KOLIBRI_RUN_MODE", None)
        return env

    def _bin(self):
        if self._kolibri_bin is None:
            raise click.ClickException("prepare() must be called before start/stop")
        return self._kolibri_bin

    def start(self):
        _check_port_free(self.port)
        _run(
            [self._bin(), "start", "--port", self.port, "--background"],
            env=self._env(),
        )
        wait_for_server(self.server_url)

    def stop(self):
        _run([self._bin(), "stop"], env=self._env())

    def restore(self):
        if self._swapped_editable:
            _swap_editable(THIS_WORKTREE)
            self._swapped_editable = False


class RemoteExecutor:
    TIMEOUTS: ClassVar[dict] = {
        "install": 1800,
        "seed-template": 3600,
        "reset-home": 600,
        "start": 360,
        "stop": 120,
    }

    def __init__(self, hub, device, port):
        self.hub = hub
        self.device = device
        self.port = port
        self._wheel_sha = None

    @property
    def server_url(self):
        return f"http://{self.hub.devices[self.device]['ip']}:{self.port}"

    def _command(self, action, params=None):
        try:
            result = self.hub.send_command(
                self.device, action, params, timeout=self.TIMEOUTS[action]
            )
        except TimeoutError as e:
            raise click.ClickException(str(e)) from e
        if not result["ok"]:
            raise click.ClickException(
                f"Device '{self.device}' failed '{action}':\n{result['detail']}"
            )
        return result

    def prepare(self, target):
        if target.is_dev:
            raise click.ClickException(
                "dev: targets cannot run on a remote device - build a wheel "
                "(worktree:/pr:/release:) instead"
            )
        sha = target.wheel_sha
        url = self.hub.publish_artifact(f"{sha}.whl", target.wheel)
        self._command(
            "install",
            {"url": url, "sha": sha, "filename": os.path.basename(target.wheel)},
        )
        self._wheel_sha = sha

    def seed_template(self, tarball, content_hash):
        url = self.hub.publish_artifact("template.tar.gz", tarball)
        self._command("seed-template", {"url": url, "hash": content_hash})

    def reset_home(self):
        self._command("reset-home")

    def start(self):
        if self._wheel_sha is None:
            raise click.ClickException("prepare() must be called before start")
        self._command("start", {"sha": self._wheel_sha, "port": self.port})

    def stop(self):
        self._command("stop")

    def restore(self):
        pass
