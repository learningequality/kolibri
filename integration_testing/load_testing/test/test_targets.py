import os
import shutil
import subprocess

import click
import pytest
from targets import parse_target
from targets import resolve

WHEEL_NAME = "kolibri-0.19.4-py2.py3-none-any.whl"


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
