import glob
import hashlib
import os
import re
import shutil
import subprocess
import sys
import tempfile

import click
from agent import prune_subdirs
from logger import info
from logger import warning
from packaging.utils import InvalidWheelFilename
from packaging.utils import parse_wheel_filename
from packaging.version import InvalidVersion
from packaging.version import Version

THIS_DIR = os.path.dirname(os.path.abspath(__file__))
WHEELS_DIR = os.path.join(THIS_DIR, "generated", "wheels")
UPSTREAM_REPO = "learningequality/kolibri"
PR_BUILD_WORKFLOW = "pr_build_kolibri.yml"
# Tracked paths that `make dist` rewrites (message extraction, compilemessages).
REGENERATED_BY_MAKE_DIST = (":(exclude)kolibri/locale",)
SOURCE_DIRS = ("kolibri", "packages")
OUTSIDE_THE_WHEEL = tuple(
    f":(exclude){path}"
    for path in (
        ".github",
        "docs",
        "integration_testing",
        "platforms",
        "python_packages",
        "test",
    )
)
# Written by 0.19.x builds and no longer gitignored on develop.
UNTRACKED_BUILD_LEFTOVERS = (":(exclude)kolibri/VERSION",)
DIRTY_PATHS_SHOWN = 5
WHEELS_KEPT = 8


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
    try:
        Version(version)
    except InvalidVersion as e:
        raise click.ClickException(f"Expected release:<version>, got '{spec}'") from e
    return "release", version


def _parse_whl(spec):
    path = os.path.abspath(spec)
    if not os.path.isfile(path):
        raise click.ClickException(f"Wheel '{path}' does not exist")
    try:
        parse_wheel_filename(os.path.basename(path))
    except InvalidWheelFilename as e:
        raise click.ClickException(f"'{path}' is not a valid wheel name: {e}") from e
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
    return str(parse_wheel_filename(os.path.basename(path))[1])


def run_checked(cmd, what, **kwargs):
    result = subprocess.run(cmd, capture_output=True, text=True, **kwargs)
    if result.returncode != 0:
        raise click.ClickException(
            f"{what} failed ({' '.join(cmd)}):\n{result.stderr.strip()}"
        )
    return result


def _single_wheel(directory, what):
    wheels = [
        path
        for path in glob.glob(os.path.join(directory, "**", "*.whl"), recursive=True)
        if os.path.isfile(path)
    ]
    if len(wheels) != 1:
        raise click.ClickException(
            f"Expected exactly one wheel from {what}, got {wheels}"
        )
    return wheels[0]


def _cached_wheel(wheels_dir, subdir):
    cached = glob.glob(os.path.join(wheels_dir, subdir, "*.whl"))
    if not cached:
        return None
    os.utime(os.path.join(wheels_dir, subdir))
    return cached[0]


def _new_cache_dir(wheels_dir, subdir):
    prune_subdirs(wheels_dir, subdir, kept=WHEELS_KEPT, log=info)
    dest_dir = os.path.join(wheels_dir, subdir)
    os.makedirs(dest_dir, exist_ok=True)
    return dest_dir


def _adopt_wheel(tmp_wheel, wheels_dir, subdir=""):
    dest_dir = _new_cache_dir(wheels_dir, subdir) if subdir else wheels_dir
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
    wanted = Version(target.source)
    for cached in glob.glob(os.path.join(wheels_dir, "kolibri-*.whl")):
        if parse_wheel_filename(os.path.basename(cached))[1] == wanted:
            return cached
    pip = _pip_launcher()
    info(f"Downloading kolibri=={target.source} from PyPI...")
    with tempfile.TemporaryDirectory() as tmp:
        run_checked(
            [
                *pip,
                "download",
                f"kolibri=={target.source}",
                "--no-deps",
                "--python-version",
                f"{sys.version_info.major}.{sys.version_info.minor}",
                "--dest",
                tmp,
            ],
            f"pip download kolibri=={target.source}",
        )
        return _adopt_wheel(_single_wheel(tmp, "pip download"), wheels_dir)


def _resolve_pr(target, wheels_dir):
    if shutil.which("gh") is None:
        raise click.ClickException("pr: targets need the gh CLI, authenticated")
    head_sha = run_checked(
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
    subdir = f"pr-{head_sha[:12]}"
    cached = _cached_wheel(wheels_dir, subdir)
    if cached:
        return cached
    run_id = run_checked(
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
            f"No '{PR_BUILD_WORKFLOW}' run for PR #{target.source} at {head_sha}"
        )
    info(f"Downloading CI wheel for PR #{target.source} ({head_sha[:12]})...")
    with tempfile.TemporaryDirectory() as tmp:
        run_checked(
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
            f"Downloading wheel artifact for PR #{target.source} (the build may "
            "still be running, have failed, or the artifact may have expired)",
        )
        return _adopt_wheel(
            _single_wheel(tmp, f"PR #{target.source} artifacts"), wheels_dir, subdir
        )


def worktree_identity(path):
    head = run_checked(
        ["git", "rev-parse", "HEAD"], "git rev-parse", cwd=path
    ).stdout.strip()
    changed = run_checked(
        [
            "git",
            "status",
            "--porcelain",
            "--untracked-files=no",
            "--",
            ".",
            *REGENERATED_BY_MAKE_DIST,
            *OUTSIDE_THE_WHEEL,
        ],
        "git status",
        cwd=path,
    ).stdout.splitlines()
    new_sources = run_checked(
        [
            "git",
            "ls-files",
            "--others",
            "--exclude-standard",
            "--",
            *SOURCE_DIRS,
            *REGENERATED_BY_MAKE_DIST,
            *UNTRACKED_BUILD_LEFTOVERS,
        ],
        "git ls-files",
        cwd=path,
    ).stdout.splitlines()
    return head[:12], [line[3:] for line in changed] + new_sources


def _worktree_build_env(worktree):
    venv = os.path.join(worktree, ".venv")
    if not os.path.isdir(venv):
        raise click.ClickException(
            f"{worktree} has no .venv - run `uv sync` in that worktree"
        )
    script_bin = os.path.dirname(sys.executable)
    path = [
        entry
        for entry in os.environ.get("PATH", "").split(os.pathsep)
        if os.path.normpath(entry) != script_bin
    ]
    return {
        **os.environ,
        "PATH": os.pathsep.join([os.path.join(venv, "bin"), *path]),
        "VIRTUAL_ENV": venv,
    }


def _resolve_worktree(target, wheels_dir):
    build_env = _worktree_build_env(target.source)
    head, dirty = worktree_identity(target.source)
    subdir = f"worktree-{head}"
    if not dirty:
        cached = _cached_wheel(wheels_dir, subdir)
        if cached:
            return cached
    else:
        shown = ", ".join(dirty[:DIRTY_PATHS_SHOWN])
        more = len(dirty) - DIRTY_PATHS_SHOWN
        if more > 0:
            shown += f" and {more} more"
        warning(f"{target.source} is dirty ({shown}); rebuilding wheel (no caching)")
    info(f"Building wheel in {target.source} (make dist - this is slow)...")
    dist = os.path.join(target.source, "dist")
    shutil.rmtree(dist, ignore_errors=True)
    run_checked(
        ["make", "dist"],
        f"make dist in {target.source}",
        cwd=target.source,
        env=build_env,
    )
    wheel = _single_wheel(dist, "make dist")
    if dirty:
        return wheel
    dest = os.path.join(_new_cache_dir(wheels_dir, subdir), os.path.basename(wheel))
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
