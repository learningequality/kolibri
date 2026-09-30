import json
import urllib.error
import urllib.request

import pytest


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


def test_late_result_after_timeout_not_stored(hub):
    _register(hub)
    with pytest.raises(TimeoutError):
        hub.send_command("pi4", "status", timeout=0.2)
    req = urllib.request.Request(
        f"{hub.url}/poll?device=pi4", headers={"X-Bench-Token": hub.token}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        command = json.loads(resp.read())
    _post(
        f"{hub.url}/result?device=pi4",
        {"id": command["id"], "ok": True, "detail": "late"},
        headers={"X-Bench-Token": hub.token},
    )
    assert command["id"] not in hub._results
