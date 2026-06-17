import os
import shutil
import subprocess

import click
import pytest
from targets import parse_target
from targets import resolve

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
    assert target.wheel == str(tmp_path / WHEEL_NAME)


def test_resolve_release_requires_pip_or_uv(monkeypatch, tmp_path, pip_calls):
    _on_path(monkeypatch)
    with pytest.raises(click.ClickException):
        resolve(parse_target("base=release:0.19.4"), wheels_dir=str(tmp_path))
    assert pip_calls == []


def _completed(cmd, stdout=""):
    return subprocess.CompletedProcess(cmd, 0, stdout, "")


@pytest.fixture()
def worktree(tmp_path, monkeypatch):
    source = tmp_path / "worktree"
    (source / "dist").mkdir(parents=True)
    state = {"status": "", "builds": 0}

    def fake_run(cmd, **kwargs):
        if cmd[:2] == ["git", "rev-parse"]:
            return _completed(cmd, HEAD_SHA + "\n")
        if cmd[:2] == ["git", "status"]:
            return _completed(cmd, state["status"])
        if cmd == ["make", "dist"]:
            state["builds"] += 1
            (source / "dist").mkdir(exist_ok=True)
            (source / "dist" / BUILT_WHEEL_NAME).write_text("built")
        return _completed(cmd)

    monkeypatch.setattr(subprocess, "run", fake_run)
    return source, state


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
    assert target.wheel == os.path.join(wheels_dir, HEAD_SHA[:12], BUILT_WHEEL_NAME)


def test_resolve_worktree_rebuilds_dirty_worktree(tmp_path, worktree):
    source, state = worktree
    state["status"] = " M kolibri/__init__.py\n"
    wheels_dir = str(tmp_path / "wheels")
    resolve(parse_target(f"fix=worktree:{source}"), wheels_dir=wheels_dir)
    resolve(parse_target(f"fix=worktree:{source}"), wheels_dir=wheels_dir)
    assert state["builds"] == 2


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
    assert target.wheel == str(tmp_path / HEAD_SHA[:12] / WHEEL_NAME)


def test_resolve_pr_reuses_wheel_for_same_head(tmp_path, pr_build_with_failed_jobs):
    resolve(parse_target("fix=pr:15424"), wheels_dir=str(tmp_path))
    resolve(parse_target("fix=pr:15424"), wheels_dir=str(tmp_path))
    assert pr_build_with_failed_jobs["downloads"] == 1
