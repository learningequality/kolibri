import os
import socket
import subprocess
import sys
import tarfile

import agent
import pytest


@pytest.fixture()
def paths(tmp_path, monkeypatch):
    base = tmp_path / "bench"
    monkeypatch.setattr(agent, "BASE", str(base))
    monkeypatch.setattr(agent, "VENVS", str(base / "venvs"))
    monkeypatch.setattr(agent, "TEMPLATE", str(base / "template"))
    monkeypatch.setattr(agent, "RUN_HOME", str(base / "run_home"))
    monkeypatch.setattr(agent, "DOWNLOADS", str(base / "downloads"))
    monkeypatch.setattr(agent, "HASH_FILE", str(base / "template.hash"))
    return base


def make_template_tar(tmp_path):
    src = tmp_path / "template_src"
    (src / "content").mkdir(parents=True)
    (src / "db.sqlite3").write_text("database")
    (src / "content" / "file.mp4").write_text("video")
    tar_path = tmp_path / "template.tar.gz"
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(src, arcname=".")
    return tar_path


def test_seed_template_downloads_and_unpacks(paths, tmp_path):
    tar_path = make_template_tar(tmp_path)
    result = agent.Agent("http://unused", "tok").do_seed_template(
        {"url": tar_path.as_uri(), "hash": "abc123"}
    )
    assert result["ok"]
    assert os.path.exists(os.path.join(agent.TEMPLATE, "db.sqlite3"))
    with open(agent.HASH_FILE) as f:
        assert f.read() == "abc123"
    assert os.listdir(agent.DOWNLOADS) == []


def test_seed_template_skips_when_hash_matches(paths, tmp_path):
    tar_path = make_template_tar(tmp_path)
    a = agent.Agent("http://unused", "tok")
    a.do_seed_template({"url": tar_path.as_uri(), "hash": "abc123"})
    result = a.do_seed_template({"url": "http://would-404", "hash": "abc123"})
    assert result["ok"]
    assert "cached" in result["detail"]


def test_seed_template_replaces_on_hash_change(paths, tmp_path):
    tar_path = make_template_tar(tmp_path)
    a = agent.Agent("http://unused", "tok")
    a.do_seed_template({"url": tar_path.as_uri(), "hash": "old"})
    stale = os.path.join(agent.TEMPLATE, "stale.txt")
    with open(stale, "w") as f:
        f.write("leftover")
    a.do_seed_template({"url": tar_path.as_uri(), "hash": "new"})
    assert not os.path.exists(stale)


def test_seed_template_failure_preserves_old_template(paths, tmp_path):
    tar_path = make_template_tar(tmp_path)
    a = agent.Agent("http://unused", "tok")
    a.do_seed_template({"url": tar_path.as_uri(), "hash": "good"})
    bad = tmp_path / "bad.tar.gz"
    bad.write_bytes(b"not a tarball")
    result = a.execute(
        {
            "id": "1",
            "action": "seed-template",
            "params": {"url": bad.as_uri(), "hash": "new"},
        }
    )
    assert not result["ok"]
    assert os.path.exists(os.path.join(agent.TEMPLATE, "db.sqlite3"))
    assert a.do_reset_home({})["ok"]


def test_prune_keeps_most_recently_used_dirs(paths):
    venvs = paths / "venvs"
    for age, sha in enumerate(["newest", "older", "oldest"]):
        (venvs / sha).mkdir(parents=True)
        os.utime(venvs / sha, (1000 - age, 1000 - age))
    agent.prune_subdirs(str(venvs), "current", kept=2)
    assert os.listdir(venvs) == ["newest"]


def test_report_retries_failed_result_post(monkeypatch):
    monkeypatch.setattr(agent, "RETRY_DELAY", 0)
    a = agent.Agent("http://unused", "tok")
    attempts = []

    def flaky_request(path, payload=None, timeout=None):
        attempts.append(payload)
        if len(attempts) < 3:
            raise agent.URLError("connection reset")
        return 200, {}

    monkeypatch.setattr(a, "_request", flaky_request)
    a.report({"id": "1", "ok": True, "detail": "done"})
    assert len(attempts) == 3


def test_reset_home_copies_template(paths, tmp_path):
    tar_path = make_template_tar(tmp_path)
    a = agent.Agent("http://unused", "tok")
    a.do_seed_template({"url": tar_path.as_uri(), "hash": "abc"})
    result = a.do_reset_home({})
    assert result["ok"]
    assert os.path.exists(os.path.join(agent.RUN_HOME, "db.sqlite3"))
    junk = os.path.join(agent.RUN_HOME, "junk.log")
    with open(junk, "w") as f:
        f.write("x")
    a.do_reset_home({})
    assert not os.path.exists(junk)


def test_reset_home_stops_a_server_still_running_on_it(paths, tmp_path):
    tar_path = make_template_tar(tmp_path)
    a = agent.Agent("http://unused", "tok")
    a.do_seed_template({"url": tar_path.as_uri(), "hash": "abc"})
    server = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
    a.server = server
    try:
        assert a.do_reset_home({})["ok"]
        assert a.server is None
        assert server.poll() is not None
    finally:
        server.kill()
        server.wait()


def _free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def test_started_server_has_telemetry_disabled(paths, tmp_path, monkeypatch):
    monkeypatch.setattr(agent, "SERVER_LOG", str(paths / "server.log"))
    env_dump = tmp_path / "env"
    monkeypatch.setenv("ENV_DUMP", str(env_dump))
    monkeypatch.setenv("KOLIBRI_RUN_MODE", "dev")
    kolibri = paths / "venvs" / "abc" / "bin" / "kolibri"
    kolibri.parent.mkdir(parents=True)
    kolibri.write_text(
        '#!/bin/sh\nprintf "%s\\n%s\\n" "$KOLIBRI_DISABLE_PING" "$KOLIBRI_RUN_MODE"'
        ' > "$ENV_DUMP"\n'
    )
    os.chmod(kolibri, 0o755)
    agent.Agent("http://unused", "tok").do_start({"sha": "abc", "port": _free_port()})
    assert env_dump.read_text().splitlines() == ["1", "load-test"]
