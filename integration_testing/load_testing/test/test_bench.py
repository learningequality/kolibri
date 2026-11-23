import json
import socket
import subprocess

import bench
import hub
import pytest
from bench import cli
from bench import warn_if_older
from click.testing import CliRunner
from compare import RUN_CONFIG_FILENAME
from targets import Target
from targets import WHEELS_KEPT


def test_run_rejects_duplicate_target_names(tmp_path):
    wheel = tmp_path / "kolibri-0.19.4-py2.py3-none-any.whl"
    wheel.write_text("wheel")
    result = CliRunner().invoke(
        cli,
        [
            "run",
            "--baseline",
            f"base={wheel}",
            f"base={wheel}",
            "--suffix",
            "r1",
            "--username",
            "admin",
            "--password",
            "admin",
        ],
    )
    assert result.exit_code == 1
    assert "Duplicate target names: base" in result.output


def test_run_rejects_dev_target_on_a_device(tmp_path):
    result = CliRunner().invoke(
        cli,
        [
            "run",
            "--device",
            "pi4",
            "--baseline",
            f"base=dev:{tmp_path}",
            "--suffix",
            "r1",
            "--username",
            "admin",
            "--password",
            "admin",
        ],
    )
    assert result.exit_code == 1
    assert "dev: targets cannot run on a remote device" in result.output


def test_run_rejects_more_cached_builds_than_the_wheel_cache_keeps(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(bench, "RESULTS_DIR", str(tmp_path))
    resolved = []
    monkeypatch.setattr(bench, "resolve", resolved.append)
    prs = [f"pr{n}=pr:{n}" for n in range(WHEELS_KEPT + 1)]
    result = CliRunner().invoke(
        cli,
        [
            "run",
            "--baseline",
            "base=release:0.19.4",
            *prs,
            "--suffix",
            "r1",
            "--username",
            "admin",
            "--password",
            "admin",
        ],
    )
    assert result.exit_code == 1
    assert f"at most {WHEELS_KEPT} pr:/worktree: targets" in result.output
    assert resolved == []


class _NoopExecutor:
    server_url = "http://localhost:8001"

    def prepare(self, target):
        pass

    def reset_home(self):
        pass

    def start(self):
        pass

    def stop(self):
        pass


def _run_target_recording_config(tmp_path, monkeypatch, target):
    def fake_loadtest(cmd, **kwargs):
        run_dir = tmp_path / cmd[cmd.index("--name") + 1]
        run_dir.mkdir()
        (run_dir / RUN_CONFIG_FILENAME).write_text(json.dumps({"name": "run"}))
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(bench, "RESULTS_DIR", str(tmp_path))
    monkeypatch.setattr(bench, "wait_for_server", lambda url: None)
    monkeypatch.setattr(subprocess, "run", fake_loadtest)
    bench._run_target(
        _NoopExecutor(),
        target,
        "t_r1",
        "admin",
        "admin",
        50,
        50,
        "3m",
        {"device": "local"},
    )
    return json.loads((tmp_path / "t_r1" / RUN_CONFIG_FILENAME).read_text())


def test_run_config_records_the_wheel_build(tmp_path, monkeypatch):
    wheel = tmp_path / "kolibri-0.19.4-py2.py3-none-any.whl"
    wheel.write_text("wheel")
    target = Target("t", "wheel-path", str(wheel))
    target.wheel = str(wheel)
    config = _run_target_recording_config(tmp_path, monkeypatch, target)
    assert config["device"] == "local"
    assert config["target"] == f"wheel-path:{wheel}"
    assert config["wheel_sha"] == target.wheel_sha


def test_run_config_records_a_dev_build_without_a_wheel(tmp_path, monkeypatch):
    target = Target("t", "dev", str(tmp_path))
    config = _run_target_recording_config(tmp_path, monkeypatch, target)
    assert config["target"] == f"dev:{tmp_path}"
    assert config["wheel_sha"] is None


def test_every_target_replays_the_baselines_har(tmp_path, monkeypatch):
    commands = []

    def fake_loadtest(cmd, **kwargs):
        commands.append(cmd)
        name = cmd[cmd.index("--name") + 1]
        (tmp_path / name).mkdir()
        config = {"name": name, "har": f"/har_files/{name}.har"}
        (tmp_path / name / RUN_CONFIG_FILENAME).write_text(json.dumps(config))
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(bench, "RESULTS_DIR", str(tmp_path))
    monkeypatch.setattr(bench, "wait_for_server", lambda url: None)
    monkeypatch.setattr(subprocess, "run", fake_loadtest)
    targets = [Target(name, "dev", str(tmp_path)) for name in ("base", "fix", "alt")]
    failures = bench._run_all_targets(
        _NoopExecutor(), targets, "r1", "admin", "admin", 50, 50, "3m", {}
    )
    assert failures == []
    assert "--har" not in commands[0]
    assert [cmd[cmd.index("--har") + 1] for cmd in commands[1:]] == [
        "/har_files/base_r1.har",
        "/har_files/base_r1.har",
    ]


HUB_PORT_IN_USE = "already in use by another `bench.py listen` or `run`"


def test_listen_explains_a_hub_port_already_in_use(monkeypatch):
    monkeypatch.setattr(hub, "load_token", lambda token_file: "token")
    with socket.socket() as listener:
        listener.bind(("0.0.0.0", 0))
        listener.listen()
        result = CliRunner().invoke(
            cli, ["listen", "--hub-port", str(listener.getsockname()[1])]
        )
    assert result.exit_code == 1
    assert HUB_PORT_IN_USE in result.output


def test_run_explains_a_hub_port_already_in_use_before_slow_setup(
    tmp_path, monkeypatch
):
    monkeypatch.setattr(hub, "load_token", lambda token_file: "token")
    monkeypatch.setattr(bench, "RESULTS_DIR", str(tmp_path / "results"))
    slow_setup = []
    monkeypatch.setattr(bench, "resolve", lambda target: slow_setup.append("resolve"))
    monkeypatch.setattr(
        bench,
        "ensure_template",
        lambda *args, **kwargs: slow_setup.append("template") or (None, "hash"),
    )
    wheel = tmp_path / "kolibri-0.19.4-py2.py3-none-any.whl"
    wheel.write_text("wheel")
    with socket.socket() as listener:
        listener.bind(("0.0.0.0", 0))
        listener.listen()
        result = CliRunner().invoke(
            cli,
            [
                "run",
                "--device",
                "pi4",
                "--hub-port",
                str(listener.getsockname()[1]),
                "--baseline",
                f"base={wheel}",
                "--suffix",
                "r1",
                "--username",
                "admin",
                "--password",
                "admin",
            ],
        )
    assert result.exit_code == 1
    assert HUB_PORT_IN_USE in result.output
    assert slow_setup == []


@pytest.mark.parametrize(
    ("target", "baseline", "warns"),
    [
        ("0.20.0b1", "0.20.0", True),
        ("0.20.0", "0.20.0b1", False),
        ("0.20.0.dev5+g1abcdef", "0.20.0.dev5+g9999999", False),
    ],
)
def test_warn_if_older_orders_by_release(capsys, target, baseline, warns):
    warn_if_older("fix", target, baseline)
    assert ("migrate backwards" in capsys.readouterr().out) == warns
