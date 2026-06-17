import os
import subprocess
import sys
import tarfile
import threading
import time

import agent as agent_module
import pytest
from agent import Agent
from hub import AGENT_SOURCE
from hub import Hub


@pytest.fixture(autouse=True)
def fast_retry(monkeypatch):
    monkeypatch.setattr(agent_module, "RETRY_DELAY", 0.2)


@pytest.fixture()
def start_agent():
    started = []

    def start(hub, hub_url=None):
        agent = Agent(hub_url or hub.url, hub.token)
        thread = threading.Thread(target=agent.run_forever, daemon=True)
        thread.start()
        started.append((agent, thread))
        deadline = time.time() + 10
        while agent.device is None and time.time() < deadline:
            time.sleep(0.05)
        assert agent.device is not None, "agent never registered"
        return agent

    yield start
    for agent, thread in started:
        agent.stop()
        thread.join(timeout=10)
        assert not thread.is_alive()


def test_agent_exits_when_the_hub_rejects_its_token(hub, tmp_path):
    result = subprocess.run(
        [sys.executable, AGENT_SOURCE, hub.url, "--token", "wrong"],
        env={**os.environ, "HOME": str(tmp_path)},
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert result.returncode == 1
    assert "token rejected" in result.stdout


def test_second_agent_on_a_device_exits(hub, tmp_path):
    command = [sys.executable, AGENT_SOURCE, hub.url, "--token", hub.token]
    env = {**os.environ, "HOME": str(tmp_path)}
    first = subprocess.Popen(command, env=env, stdout=subprocess.PIPE, text=True)
    try:
        assert "registered as" in first.stdout.readline()
        second = subprocess.run(
            command, env=env, capture_output=True, text=True, timeout=10
        )
    finally:
        first.terminate()
        first.communicate(timeout=10)
    assert second.returncode == 1
    assert "another agent is already running" in second.stdout


def test_status_roundtrip(hub, start_agent):
    agent = start_agent(hub)
    result = hub.send_command(agent.device, "status", timeout=30)
    assert result["ok"]
    assert "server_running" in result["detail"]


def test_error_results_propagate(hub, start_agent, monkeypatch, tmp_path):
    monkeypatch.setattr(agent_module, "TEMPLATE", str(tmp_path / "no_template"))
    agent = start_agent(hub)
    result = hub.send_command(agent.device, "reset-home", timeout=30)
    assert not result["ok"]
    assert "template" in result["detail"]


def test_artifacts_download_from_the_url_the_agent_reached(
    tmp_path, start_agent, monkeypatch
):
    base = tmp_path / "bench"
    monkeypatch.setattr(agent_module, "TEMPLATE", str(base / "template"))
    monkeypatch.setattr(agent_module, "DOWNLOADS", str(base / "downloads"))
    monkeypatch.setattr(agent_module, "HASH_FILE", str(base / "template.hash"))
    src = tmp_path / "template_src"
    src.mkdir()
    (src / "db.sqlite3").write_text("database")
    tarball = tmp_path / "template.tar.gz"
    with tarfile.open(tarball, "w:gz") as tar:
        tar.add(src, arcname=".")
    hub = Hub(
        host="127.0.0.1",
        port=0,
        advertise_host="127.0.0.2",
        token_file=str(tmp_path / "token"),
        poll_hold=0.5,
        mdns=False,
    )
    hub.start()
    try:
        agent = start_agent(hub, f"http://127.0.0.1:{hub._port}")
        url = hub.publish_artifact("template.tar.gz", str(tarball))
        result = hub.send_command(
            agent.device, "seed-template", {"url": url, "hash": "h"}, timeout=30
        )
        assert result["ok"], result["detail"]
        assert (base / "template" / "db.sqlite3").read_text() == "database"
    finally:
        hub.stop()


def test_agent_reregisters_after_hub_restart(tmp_path, start_agent):
    hub = Hub(
        host="127.0.0.1",
        port=0,
        token_file=str(tmp_path / "token"),
        poll_hold=0.5,
        mdns=False,
    )
    hub.start()
    agent = start_agent(hub)
    port = hub._port
    hub.stop()
    hub2 = Hub(
        host="127.0.0.1",
        port=port,
        token_file=str(tmp_path / "token"),
        poll_hold=0.5,
        mdns=False,
    )
    hub2.start()
    try:
        deadline = time.time() + 30
        while agent.device not in hub2.devices and time.time() < deadline:
            time.sleep(0.1)
        assert agent.device in hub2.devices
        result = hub2.send_command(agent.device, "status", timeout=30)
        assert result["ok"]
    finally:
        hub2.stop()
