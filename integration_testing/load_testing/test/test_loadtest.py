import json
import sys
import threading
from http.server import BaseHTTPRequestHandler
from http.server import ThreadingHTTPServer
from urllib.parse import urlparse

import click
import loadtest
import pytest
import requests
from click.testing import CliRunner
from compare import STATS_FILENAME
from loadtest import cli

UNREACHABLE_SERVER = [
    "--server",
    "http://127.0.0.1:9",
    "--username",
    "admin",
    "--password",
    "admin",
]


def test_rejects_users_not_divisible_by_processes():
    result = CliRunner().invoke(
        cli, [*UNREACHABLE_SERVER, "--users", "50", "--processes", "4", "run"]
    )
    assert result.exit_code == 2
    assert "multiple of --processes" in result.output


def test_rejects_negative_processes():
    result = CliRunner().invoke(
        cli, [*UNREACHABLE_SERVER, "--users", "50", "--processes", "-1", "run"]
    )
    assert result.exit_code == 2
    assert "--processes" in result.output


@pytest.mark.parametrize("command", ["setup", "import-users"])
def test_processes_do_not_constrain_users_outside_run(command):
    result = CliRunner().invoke(
        cli, [*UNREACHABLE_SERVER, "--users", "50", "--processes", "4", command]
    )
    assert "multiple of --processes" not in result.output


@pytest.fixture()
def info_only_server(monkeypatch):
    monkeypatch.setattr(loadtest, "VERSION_POLL_INTERVAL", 0)
    paths = []
    versions = ["1.0"]

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def _respond(self):
            paths.append(urlparse(self.path).path)
            if self.path.startswith("/api/public/info/"):
                version = versions.pop(0) if len(versions) > 1 else versions[0]
                if version is None:
                    self.send_response(200)
                    self.send_header("Transfer-Encoding", "chunked")
                    self.end_headers()
                    self.wfile.write(b"100\r\n{")
                    self.close_connection = True
                    return
                body = json.dumps({"kolibri_version": version}).encode()
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            else:
                self.send_response(500)
                self.send_header("Content-Length", "0")
                self.end_headers()

        do_GET = do_POST = do_PUT = _respond

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}", paths, versions
    server.shutdown()
    server.server_close()


@pytest.mark.parametrize("command", [[], ["run"], ["setup"], ["import-users"]])
def test_wait_for_version_polls_before_contacting_the_server(info_only_server, command):
    url, paths, _ = info_only_server
    CliRunner().invoke(
        cli,
        [
            "--server",
            url,
            "--username",
            "admin",
            "--password",
            "admin",
            "--wait-for-version",
            "1.0",
            *command,
        ],
    )
    assert paths[0] == "/api/public/info/"
    assert any(path.startswith("/api/auth/session/") for path in paths)


def test_wait_for_version_needs_consecutive_matches(info_only_server):
    url, paths, versions = info_only_server
    versions[:] = ["1.0", "0.9", "1.0", "1.0", "1.0"]
    loadtest._wait_for_version(url, "1.0", timeout=10)
    assert len(paths) == 5


def test_wait_for_version_retries_a_response_cut_off_mid_body(info_only_server):
    url, paths, versions = info_only_server
    versions[:] = [None, "1.0", "1.0", "1.0"]
    loadtest._wait_for_version(url, "1.0", timeout=10)
    assert len(paths) == 4


def test_wait_for_version_fails_fast_on_a_malformed_server_url(monkeypatch):
    monkeypatch.setattr(loadtest, "VERSION_POLL_INTERVAL", 0)
    with pytest.raises(requests.RequestException):
        loadtest._wait_for_version("localhost:8000", "1.0", timeout=0.5)


def test_stale_stats_do_not_mask_a_failed_locust_run(tmp_path):
    (tmp_path / STATS_FILENAME).write_text("stale")
    with pytest.raises(click.ClickException) as excinfo:
        loadtest._run_locust([sys.executable, "-c", "pass"], {}, str(tmp_path))
    assert f"Locust wrote no {STATS_FILENAME}" in excinfo.value.message
