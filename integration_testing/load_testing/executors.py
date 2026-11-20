import os
import shutil
import subprocess
import sys
import time
import urllib.request
from typing import ClassVar

import click
from agent import port_in_use
from agent import prune_subdirs
from agent import SERVER_ENV
from agent import tail
from agent import VENVS_KEPT
from logger import info
from targets import run_checked

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
VENVS_DIR = os.path.join(THIS_DIR, "generated", "venvs")
CORE_STATIC = os.path.join("kolibri", "core", "static", "kolibri.core.default_frontend")
RUN_HOME_PREFIX = os.path.expanduser("~/.kolibri_bench_run_")


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


def _worktree_python(worktree):
    python = os.path.join(worktree, ".venv", "bin", "python")
    if not os.path.exists(python):
        raise click.ClickException(
            f"{worktree} has no .venv - run `uv sync` in that worktree"
        )
    return python


def _check_assets_match_version(python, worktree):
    # `python -c` puts cwd on sys.path, where a kolibri source tree would
    # shadow the editable install.
    version = run_checked(
        [python, "-c", "import kolibri; print(kolibri.__version__)"],
        f"Importing kolibri from {python}",
        cwd="/",
    ).stdout.strip()
    bundle = os.path.join(
        worktree, CORE_STATIC, f"kolibri.core.default_frontend-{version}.js"
    )
    if not os.path.exists(bundle):
        raise click.ClickException(
            f"{worktree} has no built assets for version {version} (from its "
            "last `uv sync`) - run `pnpm build` in that worktree, after "
            "`uv sync` if its HEAD has moved"
        )
    return version


def _check_port_free(port):
    if port_in_use(port):
        raise click.ClickException(
            f"Port {port} is already in use - stop or kill the stale server first"
        )


class LocalExecutor:
    def __init__(self, port, run_home=None, template_dir=None):
        self.port = str(port)
        self.run_home = run_home or RUN_HOME_PREFIX + self.port
        self.template_dir = template_dir
        self._kolibri_bin = None

    @property
    def server_url(self):
        return f"http://localhost:{self.port}"

    def _venv_dir(self, wheel_sha):
        return os.path.join(VENVS_DIR, wheel_sha)

    def prepare(self, target):
        if target.is_dev:
            python = _worktree_python(target.source)
            version = _check_assets_match_version(python, target.source)
            info(f"Dev target version {version}, assets OK")
            self._kolibri_bin = os.path.join(os.path.dirname(python), "kolibri")
            return
        sha = target.wheel_sha
        venv = self._venv_dir(sha)
        kolibri = os.path.join(venv, "bin", "kolibri")
        if os.path.exists(kolibri):
            os.utime(venv)
        else:
            prune_subdirs(VENVS_DIR, sha, kept=VENVS_KEPT, log=info)
            info(f"Creating venv for {os.path.basename(target.wheel)}...")
            if os.path.exists(venv):
                shutil.rmtree(venv)
            run_checked([sys.executable, "-m", "venv", venv], "venv creation")
            run_checked(
                [os.path.join(venv, "bin", "pip"), "install", target.wheel],
                "pip install",
            )
        self._kolibri_bin = kolibri

    def reset_home(self):
        if not self.template_dir or not os.path.isdir(self.template_dir):
            raise click.ClickException(
                f"No template at '{self.template_dir}' - cannot reset the run home"
            )
        _check_port_free(self.port)
        _run(["rm", "-rf", self.run_home])
        _run(["cp", "-a", "--reflink=auto", self.template_dir, self.run_home])

    def _env(self):
        return {**os.environ, **SERVER_ENV, "KOLIBRI_HOME": self.run_home}

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
        try:
            wait_for_server(self.server_url)
        except click.ClickException as e:
            log = os.path.join(self.run_home, "logs", "kolibri.txt")
            raise click.ClickException(f"{e.message}; log tail:\n{tail(log)}") from e

    def stop(self):
        _run([self._bin(), "stop"], env=self._env())


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
