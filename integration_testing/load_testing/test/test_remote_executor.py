import threading
import time

import agent as agent_module
import click
import pytest
from agent import Agent
from executors import RemoteExecutor
from targets import Target


@pytest.fixture(autouse=True)
def fast_retry(monkeypatch):
    monkeypatch.setattr(agent_module, "RETRY_DELAY", 0.2)


@pytest.fixture()
def device(hub, monkeypatch):
    calls = []
    agent = Agent(hub.url, hub.token)

    def record(action):
        def handler(params):
            calls.append((action, params))
            return {"ok": True, "detail": action}

        return handler

    monkeypatch.setattr(agent, "do_install", record("install"))
    monkeypatch.setattr(agent, "do_seed_template", record("seed-template"))
    monkeypatch.setattr(agent, "do_reset_home", record("reset-home"))
    monkeypatch.setattr(agent, "do_start", record("start"))
    monkeypatch.setattr(agent, "do_stop", record("stop"))
    threading.Thread(target=agent.run_forever, daemon=True).start()
    deadline = time.time() + 10
    while agent.device is None and time.time() < deadline:
        time.sleep(0.05)
    assert agent.device is not None, "agent never registered"
    return agent, calls


def test_prepare_publishes_wheel_and_installs(hub, device, tmp_path):
    agent, calls = device
    wheel = tmp_path / "kolibri-0.19.4-py2.py3-none-any.whl"
    wheel.write_bytes(b"wheel")
    target = Target("base", "wheel-path", str(wheel))
    target.wheel = str(wheel)
    executor = RemoteExecutor(hub, agent.device, port=8080)
    executor.prepare(target)
    action, params = calls[-1]
    assert action == "install"
    assert params["url"].startswith(hub.url + "/artifacts/")
    assert params["sha"] in params["url"]
    assert params["filename"] == "kolibri-0.19.4-py2.py3-none-any.whl"


def test_lifecycle_commands(hub, device, tmp_path):
    agent, calls = device
    tarball = tmp_path / "template.tar.gz"
    tarball.write_bytes(b"tar")
    executor = RemoteExecutor(hub, agent.device, port=8080)
    executor.seed_template(str(tarball), "hash123")
    executor.reset_home()
    wheel = tmp_path / "kolibri-0.19.4-py2.py3-none-any.whl"
    wheel.write_bytes(b"wheel")
    target = Target("base", "wheel-path", str(wheel))
    target.wheel = str(wheel)
    executor.prepare(target)
    executor.start()
    executor.stop()
    assert [c[0] for c in calls] == [
        "seed-template",
        "reset-home",
        "install",
        "start",
        "stop",
    ]
    assert calls[0][1]["hash"] == "hash123"
    assert calls[3][1]["port"] == 8080


def test_server_url_uses_device_ip(hub, device):
    agent, _ = device
    executor = RemoteExecutor(hub, agent.device, port=8080)
    assert executor.server_url == "http://127.0.0.1:8080"


def test_failed_command_raises(hub, device, monkeypatch):
    agent, _ = device
    monkeypatch.setattr(
        agent, "do_reset_home", lambda params: {"ok": False, "detail": "boom"}
    )
    executor = RemoteExecutor(hub, agent.device, port=8080)
    with pytest.raises(click.ClickException, match="boom"):
        executor.reset_home()


def test_dev_target_rejected(hub, device, tmp_path):
    agent, _ = device
    executor = RemoteExecutor(hub, agent.device, port=8080)
    with pytest.raises(click.ClickException, match="dev"):
        executor.prepare(Target("local", "dev", str(tmp_path)))
