import glob
import hashlib
import os
import re
import shutil
import subprocess
import tempfile

import click
from logger import info
from logger import warning

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
WHEELS_DIR = os.path.join(THIS_DIR, "generated", "wheels")
UPSTREAM_REPO = "learningequality/kolibri"
PR_BUILD_WORKFLOW = "pr_build_kolibri.yml"


class Target:
    def __init__(self, name, kind, source):
        self.name = name
        self.kind = kind
        self.source = source
        self.wheel = None
        self._wheel_sha = None

    @property
    def is_dev(self):
        return self.kind == "dev"

    @property
    def wheel_sha(self):
        if self._wheel_sha is None:
            self._wheel_sha = file_sha(self.wheel)
        return self._wheel_sha


def _existing_dir(path):
    path = os.path.abspath(path)
    if not os.path.isdir(path):
        raise click.ClickException(f"'{path}' is not a directory")
    return path


def _parse_pr(spec):
    number = spec[len("pr:") :]
    if not number.isdigit():
        raise click.ClickException(f"Expected pr:<number>, got '{spec}'")
    return "pr", number


def _parse_release(spec):
    version = spec[len("release:") :]
    if not re.fullmatch(r"[0-9][0-9a-zA-Z.+]*", version):
        raise click.ClickException(f"Expected release:<version>, got '{spec}'")
    return "release", version


def _parse_whl(spec):
    path = os.path.abspath(spec)
    if not os.path.isfile(path):
        raise click.ClickException(f"Wheel '{path}' does not exist")
    return "wheel-path", path


def _parse_spec(spec):
    if spec.startswith("pr:"):
        return _parse_pr(spec)
    if spec.startswith("release:"):
        return _parse_release(spec)
    if spec.startswith("dev:"):
        return "dev", _existing_dir(spec[len("dev:") :])
    if spec.startswith("worktree:"):
        return "worktree", _existing_dir(spec[len("worktree:") :])
    if spec.endswith(".whl"):
        return _parse_whl(spec)
    if os.path.isdir(spec):
        return "worktree", os.path.abspath(spec)
    raise click.ClickException(
        f"'{spec}' is not a directory, .whl file, or known spec "
        "(pr:<number>, release:<version>, worktree:<path>, dev:<path>)"
    )


def parse_target(arg):
    name, separator, spec = arg.partition("=")
    if not separator or not name or not spec:
        raise click.ClickException(f"Expected name=spec, got '{arg}'")
    if not re.fullmatch(r"[\w.-]+", name):
        raise click.ClickException(
            f"Target name '{name}' must contain only letters, digits, '_', '.', '-'"
        )
    kind, source = _parse_spec(spec)
    return Target(name, kind, source)


def file_sha(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()[:12]


def version_from_wheel(path):
    # Wheel filename: <dist>-<version>-<python>-<abi>-<platform>.whl
    return os.path.basename(path).split("-")[1]


def version_tuple(version):
    return tuple(int(n) for n in re.findall(r"\d+", version))


def _run_checked(cmd, what, **kwargs):
    result = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        raise click.ClickException(
            f"{what} failed ({' '.join(cmd)}):\n{result.stderr.strip()}"
        )
    return result


def _single_wheel(directory, what):
    wheels = glob.glob(os.path.join(directory, "**", "*.whl"), recursive=True)
    if len(wheels) != 1:
        raise click.ClickException(
            f"Expected exactly one wheel from {what}, got {wheels}"
        )
    return wheels[0]


def _adopt_wheel(tmp_wheel, wheels_dir, subdir=""):
    dest_dir = os.path.join(wheels_dir, subdir) if subdir else wheels_dir
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, os.path.basename(tmp_wheel))
    shutil.move(tmp_wheel, dest)
    return dest


def _pip_launcher():
    if shutil.which("pip"):
        return ["pip"]
    if shutil.which("uv"):
        return ["uv", "tool", "run", "pip"]
    raise click.ClickException("release: targets need pip (or uv) on PATH")


def _resolve_release(target, wheels_dir):
    cached = glob.glob(os.path.join(wheels_dir, f"kolibri-{target.source}-*.whl"))
    if cached:
        return cached[0]
    pip = _pip_launcher()
    info(f"Downloading kolibri=={target.source} from PyPI...")
    with tempfile.TemporaryDirectory() as tmp:
        _run_checked(
            [
                *pip,
                "download",
                f"kolibri=={target.source}",
                "--no-deps",
                "--dest",
                tmp,
            ],
            f"pip download kolibri=={target.source}",
        )
        return _adopt_wheel(_single_wheel(tmp, "pip download"), wheels_dir)


def _resolve_pr(target, wheels_dir):
    if shutil.which("gh") is None:
        raise click.ClickException("pr: targets need the gh CLI, authenticated")
    head_sha = _run_checked(
        [
            "gh",
            "pr",
            "view",
            target.source,
            "--repo",
            UPSTREAM_REPO,
            "--json",
            "headRefOid",
            "--jq",
            ".headRefOid",
        ],
        f"Looking up PR #{target.source}",
    ).stdout.strip()
    subdir = head_sha[:12]
    cached = glob.glob(os.path.join(wheels_dir, subdir, "*.whl"))
    if cached:
        return cached[0]
    run_id = _run_checked(
        [
            "gh",
            "run",
            "list",
            "--repo",
            UPSTREAM_REPO,
            "--workflow",
            PR_BUILD_WORKFLOW,
            "--commit",
            head_sha,
            "--status",
            "success",
            "--limit",
            "1",
            "--json",
            "databaseId",
            "--jq",
            ".[0].databaseId",
        ],
        f"Finding build run for PR #{target.source}",
    ).stdout.strip()
    if not run_id or run_id == "null":
        raise click.ClickException(
            f"No successful '{PR_BUILD_WORKFLOW}' run for PR #{target.source} at "
            f"{head_sha} - the build may still be running, have failed, or the "
            "artifact may have expired (~90 days)"
        )
    info(f"Downloading CI wheel for PR #{target.source} ({head_sha[:12]})...")
    with tempfile.TemporaryDirectory() as tmp:
        _run_checked(
            [
                "gh",
                "run",
                "download",
                run_id,
                "--repo",
                UPSTREAM_REPO,
                "--pattern",
                "*.whl",
                "--dir",
                tmp,
            ],
            f"Downloading wheel artifact for PR #{target.source}",
        )
        return _adopt_wheel(
            _single_wheel(tmp, f"PR #{target.source} artifacts"), wheels_dir, subdir
        )


def worktree_identity(path):
    head = _run_checked(
        ["git", "rev-parse", "HEAD"], "git rev-parse", cwd=path
    ).stdout.strip()
    dirty = bool(
        _run_checked(
            ["git", "status", "--porcelain"], "git status", cwd=path
        ).stdout.strip()
    )
    return head[:12], dirty


def _resolve_worktree(target, wheels_dir):
    subdir, dirty = worktree_identity(target.source)
    if not dirty:
        cached = glob.glob(os.path.join(wheels_dir, subdir, "*.whl"))
        if cached:
            return cached[0]
    else:
        warning(f"{target.source} is dirty; rebuilding wheel (no caching)")
    info(f"Building wheel in {target.source} (make dist - this is slow)...")
    _run_checked(["make", "dist"], f"make dist in {target.source}", cwd=target.source)
    wheel = _single_wheel(os.path.join(target.source, "dist"), "make dist")
    if dirty:
        return wheel
    os.makedirs(os.path.join(wheels_dir, subdir), exist_ok=True)
    dest = os.path.join(wheels_dir, subdir, os.path.basename(wheel))
    shutil.copy2(wheel, dest)
    return dest


def resolve(target, wheels_dir=WHEELS_DIR):
    if target.kind == "dev":
        return
    if target.kind == "wheel-path":
        target.wheel = target.source
    elif target.kind == "release":
        target.wheel = _resolve_release(target, wheels_dir)
    elif target.kind == "pr":
        target.wheel = _resolve_pr(target, wheels_dir)
    elif target.kind == "worktree":
        target.wheel = _resolve_worktree(target, wheels_dir)
