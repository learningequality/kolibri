import os
import shutil
import subprocess
import sys

import click
import pytest
from targets import parse_target
from targets import resolve
from targets import worktree_identity

WHEEL_NAME = "kolibri-0.19.4-py2.py3-none-any.whl"
BUILT_WHEEL_NAME = "kolibri-0.20.0.dev1+g0123456789-py2.py3-none-any.whl"
HEAD_SHA = "0123456789abcdef0123"


@pytest.fixture()
def pip_calls(monkeypatch):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(cmd)
        dest = cmd[cmd.index("--dest") + 1]
        with open(os.path.join(dest, WHEEL_NAME), "w") as f:
            f.write("wheel")
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    return calls


def _on_path(monkeypatch, *names):
    monkeypatch.setattr(
        shutil, "which", lambda name: f"/usr/bin/{name}" if name in names else None
    )


@pytest.mark.parametrize(
    ("available", "launcher"),
    [
        (("pip", "uv"), ["pip"]),
        (("uv",), ["uv", "tool", "run", "pip"]),
    ],
)
def test_resolve_release_downloads_wheel(
    monkeypatch, tmp_path, pip_calls, available, launcher
):
    _on_path(monkeypatch, *available)
    target = parse_target("base=release:0.19.4")
    resolve(target, wheels_dir=str(tmp_path))
    assert pip_calls[0][: len(launcher) + 2] == [
        *launcher,
        "download",
        "kolibri==0.19.4",
    ]
    python_version = pip_calls[0][pip_calls[0].index("--python-version") + 1]
    assert python_version == f"{sys.version_info.major}.{sys.version_info.minor}"
    assert target.wheel == str(tmp_path / WHEEL_NAME)


def test_resolve_release_requires_pip_or_uv(monkeypatch, tmp_path, pip_calls):
    _on_path(monkeypatch)
    with pytest.raises(click.ClickException):
        resolve(parse_target("base=release:0.19.4"), wheels_dir=str(tmp_path))
    assert pip_calls == []


def test_resolve_release_reuses_cached_wheel_for_equivalent_version(
    tmp_path, pip_calls
):
    cached = tmp_path / "kolibri-0.19.0-py2.py3-none-any.whl"
    cached.write_text("wheel")
    target = parse_target("base=release:0.19")
    resolve(target, wheels_dir=str(tmp_path))
    assert target.wheel == str(cached)
    assert pip_calls == []


def test_parse_target_rejects_wheel_without_a_pep_427_name(tmp_path):
    wheel = tmp_path / "kolibri.whl"
    wheel.write_text("wheel")
    with pytest.raises(click.ClickException) as excinfo:
        parse_target(f"base={wheel}")
    assert f"'{wheel}' is not a valid wheel name" in excinfo.value.message


def _completed(cmd, stdout=""):
    return subprocess.CompletedProcess(cmd, 0, stdout, "")


@pytest.fixture()
def worktree(tmp_path, monkeypatch):
    source = tmp_path / "worktree"
    (source / "dist").mkdir(parents=True)
    (source / ".venv" / "bin").mkdir(parents=True)
    state = {"status": "", "builds": 0}

    def fake_run(cmd, **kwargs):
        if cmd[:2] == ["git", "rev-parse"]:
            return _completed(cmd, HEAD_SHA + "\n")
        if cmd[:2] == ["git", "status"]:
            return _completed(cmd, state["status"])
        if cmd == ["make", "dist"]:
            state["builds"] += 1
            state["make_env"] = kwargs.get("env")
            (source / "dist").mkdir(exist_ok=True)
            (source / "dist" / BUILT_WHEEL_NAME).write_text("built")
        return _completed(cmd)

    monkeypatch.setattr(subprocess, "run", fake_run)
    return source, state


def test_make_dist_runs_in_the_worktrees_own_environment(
    tmp_path, worktree, monkeypatch
):
    source, state = worktree
    bench_bin = os.path.dirname(sys.executable)
    monkeypatch.setenv("PATH", os.pathsep.join([bench_bin, "/usr/bin"]))
    monkeypatch.setenv("VIRTUAL_ENV", os.path.dirname(bench_bin))
    resolve(parse_target(f"fix=worktree:{source}"), wheels_dir=str(tmp_path / "w"))
    assert state["make_env"]["VIRTUAL_ENV"] == str(source / ".venv")
    assert state["make_env"]["PATH"].split(os.pathsep) == [
        str(source / ".venv" / "bin"),
        "/usr/bin",
    ]


def test_worktree_without_a_venv_asks_for_uv_sync(tmp_path, worktree):
    source, state = worktree
    shutil.rmtree(source / ".venv")
    with pytest.raises(click.ClickException) as excinfo:
        resolve(parse_target(f"fix=worktree:{source}"), wheels_dir=str(tmp_path))
    assert "uv sync" in excinfo.value.message
    assert state["builds"] == 0


def test_resolve_worktree_ignores_stale_wheels_in_dist(tmp_path, worktree):
    source, _ = worktree
    (source / "dist" / WHEEL_NAME).write_text("stale")
    target = parse_target(f"fix=worktree:{source}")
    resolve(target, wheels_dir=str(tmp_path / "wheels"))
    assert os.path.basename(target.wheel) == BUILT_WHEEL_NAME


def test_resolve_worktree_reuses_wheel_for_clean_head(tmp_path, worktree):
    source, state = worktree
    wheels_dir = str(tmp_path / "wheels")
    resolve(parse_target(f"fix=worktree:{source}"), wheels_dir=wheels_dir)
    target = parse_target(f"fix=worktree:{source}")
    resolve(target, wheels_dir=wheels_dir)
    assert state["builds"] == 1
    assert target.wheel == os.path.join(
        wheels_dir, f"worktree-{HEAD_SHA[:12]}", BUILT_WHEEL_NAME
    )


def test_resolve_worktree_rebuilds_dirty_worktree(tmp_path, worktree):
    source, state = worktree
    state["status"] = " M kolibri/__init__.py\n"
    wheels_dir = str(tmp_path / "wheels")
    resolve(parse_target(f"fix=worktree:{source}"), wheels_dir=wheels_dir)
    resolve(parse_target(f"fix=worktree:{source}"), wheels_dir=wheels_dir)
    assert state["builds"] == 2


def test_resolve_worktree_names_dirty_paths(tmp_path, worktree, capsys):
    source, state = worktree
    state["status"] = " M kolibri/__init__.py\n"
    resolve(parse_target(f"fix=worktree:{source}"), wheels_dir=str(tmp_path / "w"))
    assert "kolibri/__init__.py" in capsys.readouterr().out


def _git(repo, *args):
    subprocess.run(
        ["git", "-c", "user.name=t", "-c", "user.email=t@t", *args],
        cwd=repo,
        check=True,
        capture_output=True,
    )


REGENERATED_PATHS = ("kolibri/locale/en/LC_MESSAGES/app-messages.json",)
OUTSIDE_THE_WHEEL = (
    "docs/index.rst",
    "integration_testing/load_testing/bench.py",
    ".github/workflows/tox.yml",
)


@pytest.fixture()
def git_repo(tmp_path, monkeypatch):
    # git hooks and `rebase -x` export GIT_DIR/GIT_INDEX_FILE, which would
    # point these commands at the enclosing repository.
    for name in [name for name in os.environ if name.startswith("GIT_")]:
        monkeypatch.delenv(name)
    repo = tmp_path / "repo"
    for path in (*REGENERATED_PATHS, *OUTSIDE_THE_WHEEL, "kolibri/__init__.py"):
        (repo / path).parent.mkdir(parents=True, exist_ok=True)
        (repo / path).write_text("original")
    _git(repo, "init", "-q")
    _git(repo, "add", ".")
    _git(repo, "commit", "-q", "--no-verify", "-m", "init")
    return repo


@pytest.mark.parametrize("regenerated", REGENERATED_PATHS)
def test_worktree_identity_ignores_files_make_dist_regenerates(git_repo, regenerated):
    (git_repo / regenerated).write_text("regenerated")
    assert not worktree_identity(str(git_repo))[1]
    (git_repo / "kolibri/__init__.py").write_text("edited")
    assert worktree_identity(str(git_repo))[1]


@pytest.mark.parametrize("path", OUTSIDE_THE_WHEEL)
def test_worktree_identity_ignores_edits_outside_the_wheel(git_repo, path):
    (git_repo / path).write_text("edited")
    assert not worktree_identity(str(git_repo))[1]


@pytest.mark.parametrize("source", ["kolibri/new_module.py", "packages/kolibri/new.js"])
def test_worktree_identity_counts_only_untracked_source_files(git_repo, source):
    (git_repo / ".edits").mkdir()
    (git_repo / ".edits" / "notes.md").write_text("scratch")
    (git_repo / "RESULTS.md").write_text("scratch")
    (git_repo / "kolibri" / "VERSION").write_text("0.19.5.dev300+gd50d8cb17")
    assert not worktree_identity(str(git_repo))[1]
    (git_repo / source).parent.mkdir(parents=True, exist_ok=True)
    (git_repo / source).write_text("source")
    assert worktree_identity(str(git_repo))[1]


@pytest.fixture()
def pr_build_with_failed_jobs(monkeypatch):
    state = {"downloads": 0}

    def fake_run(cmd, **kwargs):
        if cmd[:3] == ["gh", "pr", "view"]:
            return _completed(cmd, HEAD_SHA + "\n")
        if cmd[:3] == ["gh", "run", "list"]:
            status = cmd[cmd.index("--status") + 1] if "--status" in cmd else None
            return _completed(cmd, "" if status == "success" else "42\n")
        if cmd[:3] == ["gh", "run", "download"]:
            state["downloads"] += 1
            artifact_dir = os.path.join(cmd[cmd.index("--dir") + 1], WHEEL_NAME)
            os.makedirs(artifact_dir)
            with open(os.path.join(artifact_dir, WHEEL_NAME), "w") as f:
                f.write("wheel")
        return _completed(cmd)

    monkeypatch.setattr(subprocess, "run", fake_run)
    _on_path(monkeypatch, "gh")
    return state


def test_resolve_pr_downloads_wheel_despite_failed_jobs(
    tmp_path, pr_build_with_failed_jobs
):
    target = parse_target("fix=pr:15424")
    resolve(target, wheels_dir=str(tmp_path))
    assert target.wheel == str(tmp_path / f"pr-{HEAD_SHA[:12]}" / WHEEL_NAME)


def test_resolve_pr_reuses_wheel_for_same_head(tmp_path, pr_build_with_failed_jobs):
    resolve(parse_target("fix=pr:15424"), wheels_dir=str(tmp_path))
    resolve(parse_target("fix=pr:15424"), wheels_dir=str(tmp_path))
    assert pr_build_with_failed_jobs["downloads"] == 1


def test_pr_and_worktree_wheels_for_the_same_commit_are_cached_apart(
    tmp_path, pr_build_with_failed_jobs, request
):
    wheels_dir = str(tmp_path / "wheels")
    resolve(parse_target("fix=pr:15424"), wheels_dir=wheels_dir)
    source, _ = request.getfixturevalue("worktree")
    target = parse_target(f"base=worktree:{source}")
    resolve(target, wheels_dir=wheels_dir)
    assert os.path.basename(target.wheel) == BUILT_WHEEL_NAME
