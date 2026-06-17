import threading
import time

import agent as agent_module
import pytest
from agent import Agent
from hub import Hub


@pytest.fixture(autouse=True)
def fast_retry(monkeypatch):
    monkeypatch.setattr(agent_module, "RETRY_DELAY", 0.2)


def start_agent(hub):
    agent = Agent(hub.url, hub.token)
    thread = threading.Thread(target=agent.run_forever, daemon=True)
    thread.start()
    deadline = time.time() + 10
    while agent.device is None and time.time() < deadline:
        time.sleep(0.05)
    assert agent.device is not None, "agent never registered"
    return agent


def test_status_roundtrip(hub):
    agent = start_agent(hub)
    result = hub.send_command(agent.device, "status", timeout=30)
    assert result["ok"]
    assert "server_running" in result["detail"]


def test_error_results_propagate(hub, monkeypatch, tmp_path):
    monkeypatch.setattr(agent_module, "TEMPLATE", str(tmp_path / "no_template"))
    agent = start_agent(hub)
    result = hub.send_command(agent.device, "reset-home", timeout=30)
    assert not result["ok"]
    assert "template" in result["detail"]


def test_agent_reregisters_after_hub_restart(tmp_path):
    hub = Hub(
        host="127.0.0.1", port=0, token_file=str(tmp_path / "token"), poll_hold=0.5
    )
    hub.start()
    agent = start_agent(hub)
    port = hub._port
    hub.stop()
    hub2 = Hub(
        host="127.0.0.1", port=port, token_file=str(tmp_path / "token"), poll_hold=0.5
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
