import json
import os
import re
import socket
import stat
import sys
import threading
import time
import types
import urllib.error
import urllib.request

import pytest
from hub import Hub
from hub import load_token


def _post(url, payload, headers=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", **(headers or {})},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read() or b"{}")


def _register(hub, hostname="pi4"):
    status, body = _post(
        f"{hub.url}/register",
        {"hostname": hostname, "platform": "Linux", "python": "3.9.2"},
        headers={"X-Bench-Token": hub.token},
    )
    assert status == 200
    return body["device"]


def test_same_hostname_from_another_ip_gets_a_suffix(hub):
    assert hub.register_device("pi", {"ip": "10.0.0.1"}) == "pi"
    assert hub.register_device("pi", {"ip": "10.0.0.2"}) == "pi-2"
    assert hub.register_device("pi", {"ip": "10.0.0.1"}) == "pi"


@pytest.fixture()
def advertised(monkeypatch):
    registered = []

    class ServiceInfo:
        def __init__(self, *args, addresses, **kwargs):
            self.addresses = addresses

    class Zeroconf:
        def register_service(self, info):
            registered.extend(info.addresses)

        def unregister_service(self, info):
            pass

        def close(self):
            pass

    fake = types.ModuleType("zeroconf")
    fake.ServiceInfo = ServiceInfo
    fake.Zeroconf = Zeroconf
    monkeypatch.setitem(sys.modules, "zeroconf", fake)
    resolve = socket.gethostbyname
    monkeypatch.setattr(
        socket,
        "gethostbyname",
        lambda name: "192.0.2.10" if name == "bench-host" else resolve(name),
    )
    return registered


def _start_and_stop_hub(tmp_path, advertise_host):
    hub = Hub(
        host="127.0.0.1",
        port=0,
        advertise_host=advertise_host,
        token_file=str(tmp_path / "token"),
    )
    hub.start()
    hub.stop()


def test_mdns_advertises_a_hostname_hub_host_by_its_address(tmp_path, advertised):
    _start_and_stop_hub(tmp_path, "bench-host")
    assert advertised == [socket.inet_aton("192.0.2.10")]


def test_mdns_is_skipped_when_the_hub_host_resolves_to_loopback(
    tmp_path, advertised, capsys
):
    _start_and_stop_hub(tmp_path, "localhost")
    assert advertised == []
    assert "loopback" in capsys.readouterr().err


def test_mdns_closes_zeroconf_when_registration_fails(
    tmp_path, advertised, monkeypatch
):
    closed = []
    zeroconf = sys.modules["zeroconf"]

    class NameTaken(zeroconf.Zeroconf):
        def register_service(self, info):
            raise RuntimeError("NonUniqueNameException")

        def close(self):
            closed.append(True)

    monkeypatch.setattr(zeroconf, "Zeroconf", NameTaken)
    _start_and_stop_hub(tmp_path, "bench-host")
    assert closed == [True]


def test_token_file_is_never_readable_by_others(tmp_path, monkeypatch):
    monkeypatch.setattr(os, "chmod", lambda path, mode: None)
    token_file = tmp_path / "generated" / "hub_token"
    previous = os.umask(0)
    try:
        token = load_token(str(token_file))
    finally:
        os.umask(previous)
    assert stat.S_IMODE(token_file.stat().st_mode) == 0o600
    assert load_token(str(token_file)) == token


def test_token_is_hex_so_it_never_starts_with_a_dash(tmp_path):
    assert re.fullmatch(r"[0-9a-f]+", load_token(str(tmp_path / "hub_token")))


def test_register_requires_token(hub):
    with pytest.raises(urllib.error.HTTPError) as excinfo:
        _post(f"{hub.url}/register", {"hostname": "pi4"})
    assert excinfo.value.code == 401


def test_poll_requires_token(hub):
    _register(hub)
    with pytest.raises(urllib.error.HTTPError) as excinfo:
        urllib.request.urlopen(f"{hub.url}/poll?device=pi4", timeout=10)
    assert excinfo.value.code == 401


def test_result_requires_token(hub):
    _register(hub)
    with pytest.raises(urllib.error.HTTPError) as excinfo:
        _post(f"{hub.url}/result?device=pi4", {"id": "x", "ok": True, "detail": ""})
    assert excinfo.value.code == 401


@pytest.mark.parametrize("path", ["/agent.py", "/devices", "/artifacts/t.tar.gz"])
@pytest.mark.parametrize("token", [None, "wrong"])
def test_get_rejects_missing_or_wrong_token(hub, tmp_path, path, token):
    artifact = tmp_path / "t.tar.gz"
    artifact.write_bytes(b"data")
    hub.publish_artifact("t.tar.gz", str(artifact))
    headers = {"X-Bench-Token": token} if token else {}
    req = urllib.request.Request(f"{hub.url}{path}", headers=headers)
    with pytest.raises(urllib.error.HTTPError) as excinfo:
        urllib.request.urlopen(req, timeout=10)
    assert excinfo.value.code == 401


def test_agent_fetched_with_token_embeds_it(hub):
    assert hub.token in hub.connect_commands()[-1]
    req = urllib.request.Request(
        f"{hub.url}/agent.py", headers={"X-Bench-Token": hub.token}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        source = resp.read().decode()
    assert f"EMBEDDED_TOKEN = {hub.token!r}" in source


def _poll(hub, device="pi4"):
    req = urllib.request.Request(
        f"{hub.url}/poll?device={device}", headers={"X-Bench-Token": hub.token}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = resp.read()
        return resp.status, json.loads(body) if body else None


def _send_in_background(hub, timeout):
    errors = []

    def send():
        try:
            hub.send_command("pi4", "status", timeout=timeout)
        except TimeoutError as e:
            errors.append(e)

    thread = threading.Thread(target=send)
    thread.start()
    return thread, errors


def test_late_result_after_timeout_not_stored(hub):
    _register(hub)
    sender, errors = _send_in_background(hub, timeout=2)
    _, command = _poll(hub)
    sender.join()
    assert errors
    _post(
        f"{hub.url}/result?device=pi4",
        {"id": command["id"], "ok": True, "detail": "late"},
        headers={"X-Bench-Token": hub.token},
    )
    assert command["id"] not in hub._results


def test_timed_out_command_not_delivered(hub):
    _register(hub)
    with pytest.raises(TimeoutError):
        hub.send_command("pi4", "status", timeout=0.2)
    assert _poll(hub) == (204, None)


def test_newer_poll_supersedes_waiting_poll(tmp_path):
    hub = Hub(
        host="127.0.0.1",
        port=0,
        token_file=str(tmp_path / "token"),
        poll_hold=5,
        mdns=False,
    )
    hub.start()
    try:
        _register(hub)
        polls = {}
        stale = threading.Thread(target=lambda: polls.update(stale=_poll(hub)))
        stale.start()
        deadline = time.monotonic() + 3
        while hub._poll_generations.get("pi4") != 1:
            assert time.monotonic() < deadline
            time.sleep(0.01)
        fresh = threading.Thread(target=lambda: polls.update(fresh=_poll(hub)))
        fresh.start()
        stale.join(timeout=3)
        assert polls["stale"] == (204, None)
        sender, _ = _send_in_background(hub, timeout=0.5)
        fresh.join(timeout=3)
        sender.join()
        assert polls["fresh"][1]["action"] == "status"
    finally:
        hub.stop()
