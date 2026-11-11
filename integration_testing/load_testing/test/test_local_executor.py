import os
import subprocess

import click
import executors
import pytest
from executors import LocalExecutor
from targets import Target


def _make_venv(venv):
    os.makedirs(os.path.join(venv, "bin"))
    open(os.path.join(venv, "bin", "kolibri"), "w").close()


def _wheel_target(sha):
    target = Target(sha, "wheel-path", f"{sha}.whl")
    target.wheel = target.source
    target._wheel_sha = sha
    return target


@pytest.fixture()
def venvs_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(executors, "VENVS_DIR", str(tmp_path))
    return tmp_path


def _fake_run(pip_returncode=0, pip_stderr=""):
    def fake_run(cmd, **kwargs):
        if cmd[1:3] == ["-m", "venv"]:
            _make_venv(cmd[3])
        if cmd[1:2] == ["install"]:
            return subprocess.CompletedProcess(cmd, pip_returncode, "", pip_stderr)
        return subprocess.CompletedProcess(cmd, 0, "", "")

    return fake_run


def test_prepare_keeps_most_recently_used_venvs(venvs_dir, monkeypatch, capsys):
    monkeypatch.setattr(subprocess, "run", _fake_run())
    for age, sha in enumerate("abcd"):
        _make_venv(str(venvs_dir / sha))
        os.utime(venvs_dir / sha, (age + 1, age + 1))
    executor = LocalExecutor(port=8001, run_home=str(venvs_dir / "home"))
    executor.prepare(_wheel_target("a"))
    executor.prepare(_wheel_target("e"))
    assert sorted(os.listdir(venvs_dir)) == ["a", "c", "d", "e"]
    pruned = [
        line for line in capsys.readouterr().out.splitlines() if "pruning" in line
    ]
    assert pruned == [f"pruning {venvs_dir / 'b'}"]


def test_failed_pip_install_reports_its_stderr(venvs_dir, monkeypatch):
    monkeypatch.setattr(
        subprocess, "run", _fake_run(pip_returncode=1, pip_stderr="no such wheel")
    )
    executor = LocalExecutor(port=8001, run_home=str(venvs_dir / "home"))
    with pytest.raises(click.ClickException) as excinfo:
        executor.prepare(_wheel_target("a"))
    assert "no such wheel" in excinfo.value.message


def test_started_server_has_telemetry_disabled(venvs_dir, monkeypatch):
    monkeypatch.setenv("KOLIBRI_RUN_MODE", "dev")
    envs = []

    def fake_run(cmd, **kwargs):
        envs.append(kwargs.get("env"))
        return subprocess.CompletedProcess(cmd, 0, "", "")

    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.setattr(executors, "wait_for_server", lambda url: None)
    monkeypatch.setattr(executors, "port_in_use", lambda port: False)
    _make_venv(str(venvs_dir / "a"))
    executor = LocalExecutor(port=8001, run_home=str(venvs_dir / "home"))
    executor.prepare(_wheel_target("a"))
    executor.start()
    assert envs[-1]["KOLIBRI_DISABLE_PING"] == "1"
    assert envs[-1]["KOLIBRI_RUN_MODE"] == "load-test"


def test_server_that_never_comes_up_reports_its_log(venvs_dir, monkeypatch):
    def never_up(url):
        raise click.ClickException(f"Server did not come up at {url}")

    monkeypatch.setattr(
        subprocess, "run", lambda cmd, **kwargs: subprocess.CompletedProcess(cmd, 0)
    )
    monkeypatch.setattr(executors, "wait_for_server", never_up)
    monkeypatch.setattr(executors, "port_in_use", lambda port: False)
    run_home = venvs_dir / "home"
    (run_home / "logs").mkdir(parents=True)
    (run_home / "logs" / "kolibri.txt").write_text("OperationalError: no such table")
    _make_venv(str(venvs_dir / "a"))
    executor = LocalExecutor(port=8001, run_home=str(run_home))
    executor.prepare(_wheel_target("a"))
    with pytest.raises(click.ClickException) as excinfo:
        executor.start()
    assert "OperationalError: no such table" in excinfo.value.message


def test_reset_home_leaves_a_live_servers_home_alone(tmp_path, monkeypatch):
    monkeypatch.setattr(executors, "port_in_use", lambda port: True)
    template = tmp_path / "template"
    template.mkdir()
    run_home = tmp_path / "home"
    run_home.mkdir()
    (run_home / "server.pid").write_text("1234")
    executor = LocalExecutor(
        port=8001, run_home=str(run_home), template_dir=str(template)
    )
    with pytest.raises(click.ClickException):
        executor.reset_home()
    assert (run_home / "server.pid").read_text() == "1234"


def test_default_run_homes_differ_by_port():
    assert LocalExecutor(port=8001).run_home != LocalExecutor(port=8002).run_home


def _dev_worktree(tmp_path, python_script):
    worktree = tmp_path / "worktree"
    python = worktree / ".venv" / "bin" / "python"
    python.parent.mkdir(parents=True)
    python.write_text(f"#!/bin/sh\n{python_script}\n")
    os.chmod(python, 0o755)
    return Target("dev", "dev", str(worktree))


@pytest.mark.parametrize(
    ("python_script", "message"),
    [
        ("echo 0.20.0", "pnpm build"),
        ("echo 'No module named kolibri' >&2; exit 1", "No module named kolibri"),
    ],
)
def test_dev_target_without_usable_build_explains_the_fix(
    tmp_path, python_script, message
):
    executor = LocalExecutor(port=8001, run_home=str(tmp_path / "home"))
    with pytest.raises(click.ClickException) as excinfo:
        executor.prepare(_dev_worktree(tmp_path, python_script))
    assert message in excinfo.value.message


def _with_built_bundle(target, version):
    static_dir = os.path.join(target.source, executors.CORE_STATIC)
    os.makedirs(static_dir)
    bundle = f"kolibri.core.default_frontend-{version}.js"
    open(os.path.join(static_dir, bundle), "w").close()
    return target


def test_dev_target_with_matching_assets_is_prepared(tmp_path):
    target = _with_built_bundle(_dev_worktree(tmp_path, "echo 0.20.0"), "0.20.0")
    LocalExecutor(port=8001, run_home=str(tmp_path / "home")).prepare(target)


def test_dev_target_with_assets_for_a_longer_version_needs_a_build(tmp_path):
    target = _with_built_bundle(_dev_worktree(tmp_path, "echo 0.20.0"), "0.20.0a1")
    with pytest.raises(click.ClickException) as excinfo:
        LocalExecutor(port=8001, run_home=str(tmp_path / "home")).prepare(target)
    assert "pnpm build" in excinfo.value.message
