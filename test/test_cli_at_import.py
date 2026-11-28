"""
Tests for `kolibri.utils.cli` module.
These tests deliberately omit `@pytest.mark.django_db` from the tests,
so that any attempt to access the Django database during the running
of these cli methods will result in an error and test failure.
"""

import importlib
import os
import socket
import sqlite3
import subprocess
import sys
import threading
from contextlib import closing
from contextlib import ExitStack
from functools import partial
from textwrap import dedent
from time import monotonic
from types import SimpleNamespace
from unittest.mock import MagicMock
from unittest.mock import Mock
from unittest.mock import patch

import pytest

from kolibri.utils import cli

# Patched inside each test, after kolibri is imported: env.set_env() prepends
# kolibri/dist to sys.path, so resolving Django earlier can bind a different copy.
DJANGO_CONNECT = "django.db.backends.base.base.BaseDatabaseWrapper.connect"


def test_status_no_db_access():
    """
    Tests that status does not try to access the database
    """
    with patch(DJANGO_CONNECT) as connect_mock:
        try:
            cli.status.callback()
        except SystemExit:
            pass
    connect_mock.assert_not_called()


@pytest.mark.parametrize(
    (
        "advertised_port",
        "hostname_state",
        "prefix",
        "encoded_prefix",
        "listen_address",
        "cherrypy_start",
    ),
    [
        (80, "available", "kolibri/", "kolibri/", "0.0.0.0", True),
        (8000, "available", "kolibri/", "kolibri/", "0.0.0.0", True),
        (80, "missing_table", "kolibri/", "kolibri/", "0.0.0.0", True),
        (80, "missing_file", "kolibri/", "kolibri/", "0.0.0.0", True),
        (80, "corrupt", "kolibri/", "kolibri/", "0.0.0.0", True),
        (80, "locked", "kolibri/", "kolibri/", "0.0.0.0", True),
        (80, "available", None, "", "0.0.0.0", True),
        (80, "available", "school#lab/", "school%23lab/", "10.0.0.5", True),
        (80, "available", "kolibri/", "kolibri/", "10.0.0.5", True),
        (80, "loopback_403", "kolibri/", "kolibri/", "10.0.0.5", True),
        (80, "loopback_404", "kolibri/", "kolibri/", "10.0.0.5", True),
        (80, "missing_file_uri", "kolibri/", "kolibri/", "0.0.0.0", True),
        (80, "file_uri", "kolibri/", "kolibri/", "0.0.0.0", True),
        (80, "memory_uri", "kolibri/", "kolibri/", "0.0.0.0", True),
        (80, "available", "kolibri/", "kolibri/", "10.0.0.5", False),
        (80, "available", "school:lab/", "school:lab/", "10.0.0.5", False),
        (80, "available", "kolibri/", "kolibri/", "127.0.0.2", True),
    ],
)
def test_status_reports_lan_urls_from_fresh_process(
    tmp_path,
    advertised_port,
    hostname_state,
    prefix,
    encoded_prefix,
    listen_address,
    cherrypy_start,
):
    (tmp_path / "server.pid").write_text(f"{os.getpid()}\n8080\n\n0\n")
    (tmp_path / "server.pid.bind").write_text(f"{os.getpid()}\n{listen_address}\n")
    env = {
        **os.environ,
        "DJANGO_SETTINGS_MODULE": "kolibri.deployment.default.settings.base",
        "http_proxy": "http://proxy.example:3128",
        "no_proxy": "127.0.0.1",
        "KOLIBRI_DATABASE_ENGINE": "sqlite",
        "KOLIBRI_HOME": str(tmp_path),
        "KOLIBRI_LISTEN_ADDRESS": listen_address,
        "KOLIBRI_ADVERTISED_HTTP_PORT": str(advertised_port),
        "KOLIBRI_CHERRYPY_START": "true" if cherrypy_start else "false",
    }
    if prefix is None:
        env.pop("KOLIBRI_URL_PATH_PREFIX", None)
    else:
        env["KOLIBRI_URL_PATH_PREFIX"] = prefix
    hostname_db = tmp_path / "networklocation.sqlite3"
    if hostname_state == "missing_table":
        hostname_db.touch()
    elif hostname_state == "corrupt":
        hostname_db.write_bytes(b"not a SQLite database")
    elif hostname_state in (
        "available",
        "locked",
        "loopback_403",
        "loopback_404",
        "file_uri",
        "memory_uri",
    ):
        seed_script = dedent(
            """\
            import kolibri
            import django

            django.setup()

            from django.db import connections, router
            from kolibri.core.discovery.models import LocalHostname

            alias = router.db_for_write(LocalHostname)
            with connections[alias].schema_editor() as editor:
                editor.create_model(LocalHostname)
            LocalHostname.objects.create(hostname="kolibri.local")
            """
        )
        seed = subprocess.run(
            [sys.executable, "-c", seed_script],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            timeout=15,
        )
        assert seed.returncode == 0, seed.stderr

    probe_address = (
        listen_address
        if cherrypy_start and listen_address != "0.0.0.0"
        else "127.0.0.1"
    )
    probe_url = f"http://{probe_address}:8080/{encoded_prefix}status/"
    script = dedent(
        """\
        import socket
        import sys
        from contextlib import ExitStack
        from time import monotonic
        from unittest.mock import Mock, patch
        from urllib.parse import urlsplit

        from kolibri.utils import cli, server
        from django.apps import apps
        from urllib3.util import connection

        assert not apps.ready

        if sys.argv[2] in ("file_uri", "missing_file_uri", "memory_uri"):
            database = server.settings.DATABASES[server.NETWORK_LOCATION]
            database["NAME"] = sys.argv[3]
            if sys.argv[2] == "missing_file_uri":
                database["NAME"] += "#hostname"

        send = server.requests.adapters.HTTPAdapter.send

        def refuse_connection(address, *args, **kwargs):
            assert address == ("127.0.0.1", 8080)
            raise ConnectionRefusedError()

        def probe(adapter, request, **kwargs):
            requests = server.requests
            assert request.url == sys.argv[4]
            assert kwargs["timeout"] in (3, (3, 3))
            if request.url != sys.argv[1]:
                clock.return_value = 2.4
                if sys.argv[2] not in ("loopback_403", "loopback_404"):
                    return send(adapter, request, **kwargs)
            response = requests.Response()
            response.status_code = {
                "loopback_403": 403, "loopback_404": 404,
            }.get(sys.argv[2], 200)
            response.url = request.url
            response._content = b""
            response._content_consumed = True
            return response

        adapter = server.ifaddr.Adapter(
            "eth0", "eth0", [server.ifaddr.IP("10.0.0.5", 24, "eth0")]
        )
        with ExitStack() as stack:
            alternate_url = urlsplit(sys.argv[1]) if sys.argv[1] != sys.argv[4] else None
            if alternate_url:
                client_socket, listener_socket = socket.socketpair()
                stack.enter_context(client_socket)
                stack.enter_context(listener_socket)
                listener_socket.settimeout(1)
                listener_socket.sendall(b"HTTP/1.1 200 OK\\r\\nContent-Length: 0\\r\\n\\r\\n")
                transport = Mock(wraps=client_socket)
                transport.setsockopt = Mock()

                def connect_alternate(address, timeout, source_address):
                    assert address == (alternate_url.hostname, alternate_url.port)
                    assert 0 < timeout <= 3 - clock()
                    return transport

                stack.enter_context(patch.object(socket, "create_connection", connect_alternate))
            stack.enter_context(patch.object(connection, "create_connection", refuse_connection))
            stack.enter_context(patch.object(server.requests.adapters.HTTPAdapter, "send", probe))
            stack.enter_context(patch.object(server.ifaddr, "get_adapters", return_value=[adapter]))
            route_socket = stack.enter_context(patch.object(server.socket, "socket"))
            route_socket.return_value.getsockname.return_value = ("10.0.0.5", 0)
            clock = stack.enter_context(patch.object(server.time, "monotonic", return_value=0))
            started = monotonic()
            try:
                cli.main(["status"])
            except SystemExit as error:
                if error.code == 0 and alternate_url:
                    request = stack.enter_context(listener_socket.makefile("rb"))
                    assert request.readline().split()[:2] == [b"GET", alternate_url.path.encode()]
                raise
            finally:
                assert not apps.ready
                if sys.argv[2] == "locked":
                    assert monotonic() - started < 4
        """
    )
    hostname_uri = hostname_db.as_uri() + {
        "file_uri": "?cache=private&mode=rw",
        "memory_uri": "?mode=memory&cache=shared",
    }.get(hostname_state, "")
    with ExitStack() as stack:
        if hostname_state == "locked":
            db = stack.enter_context(closing(sqlite3.connect(str(hostname_db))))
            db.execute("PRAGMA journal_mode = DELETE")
            db.execute("BEGIN EXCLUSIVE")
        result = subprocess.run(
            [
                sys.executable,
                "-c",
                script,
                probe_url,
                hostname_state,
                hostname_uri,
                f"http://127.0.0.1:8080/{encoded_prefix}status/",
            ],
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            timeout=15,
        )
    assert result.returncode == 0, result.stderr
    if hostname_state in ("missing_file", "missing_file_uri"):
        assert not hostname_db.exists()
    port_suffix = "" if advertised_port == 80 else f":{advertised_port}"
    expected = [
        "OK, running (0)",
        "Kolibri running on:",
        "",
        f"\thttp://10.0.0.5{port_suffix}/{encoded_prefix}",
    ]
    if listen_address == "127.0.0.2":
        expected[-1] = f"\thttp://127.0.0.2{port_suffix}/{encoded_prefix}"
    elif hostname_state in ("available", "loopback_403", "loopback_404", "file_uri"):
        expected.append(f"\thttp://kolibri.local{port_suffix}/{encoded_prefix}")
    assert result.stderr.splitlines()[-len(expected) :] == expected


def _mock_direct_probe(host, port, timeout, *, clock, sent, responses):
    assert 0 < timeout <= 3 - clock()
    connection = Mock()

    def request(method, path):
        assert method == "GET"
        sent.append(f"http://{host}:{port}{path}")
        outcome = next(responses)
        if isinstance(outcome, cli.server.requests.ConnectionError):
            raise ConnectionRefusedError()
        status, location = outcome
        response = MagicMock(status=status)
        response.headers = {"Location": location} if location else {}
        response.read.side_effect = AssertionError("Unexpected body read")
        connection.getresponse.return_value.__enter__.return_value = response

    connection.request.side_effect = request
    connection.getresponse.return_value = MagicMock()
    return connection


@pytest.fixture
def run_status(tmp_path, monkeypatch):
    server = cli.server
    pid_file = tmp_path / "server.pid"
    monkeypatch.setattr(server, "PID_FILE", str(pid_file))
    monkeypatch.setenv("no_proxy", "127.0.0.1")
    for option, value in {
        "LISTEN_ADDRESS": "10.0.0.5",
        "ADVERTISED_HTTP_PORT": None,
        "URL_PATH_PREFIX": "kolibri/",
    }.items():
        monkeypatch.setitem(server.conf.OPTIONS["Deployment"], option, value)

    adapter = server.ifaddr.Adapter(
        "eth0",
        "eth0",
        [server.ifaddr.IP(address, 24, "eth0") for address in ("10.0.0.5", "10.0.0.6")],
    )
    monkeypatch.setattr(server.ifaddr, "get_adapters", lambda: [adapter])

    def run(
        responses,
        cherrypy_start=True,
        bind_address="10.0.0.5",
        proxy=None,
        response_time=0,
    ):
        monkeypatch.setitem(
            server.conf.OPTIONS["Server"], "CHERRYPY_START", cherrypy_start
        )
        if bind_address is None:
            pid_file.write_text(f"{os.getpid()}\n8080\n\n0\n")
        else:
            bus = SimpleNamespace(
                pid_file=str(pid_file), port=8080, zip_port=0, subscribe=Mock()
            )
            with patch.dict(
                server.conf.OPTIONS["Deployment"], LISTEN_ADDRESS=bind_address
            ):
                server.PIDPlugin(bus).SERVING(bus.port)
        sent = []
        responses = iter(responses)
        clock = Mock(return_value=0)
        monkeypatch.setattr(server, "time", Mock(monotonic=clock))

        def send(adapter, request, timeout, **kwargs):
            sent.append(request.url)
            connect_timeout, read_timeout = (
                timeout if isinstance(timeout, tuple) else (timeout, timeout)
            )
            assert 0 < connect_timeout <= 3 - clock()
            assert 0 < read_timeout <= 3 - clock()
            if proxy and (
                proxy
                == server.requests.utils.select_proxy(request.url, kwargs["proxies"])
            ):
                raise server.requests.exceptions.ProxyError(
                    request=request
                ) from ConnectionRefusedError()
            outcome = next(responses)
            if isinstance(outcome, server.requests.ConnectionError):
                outcome.request = request
                raise outcome from ConnectionRefusedError()
            if isinstance(outcome, server.requests.exceptions.ReadTimeout):
                clock.return_value += read_timeout
                raise outcome
            status, location = outcome
            clock.return_value += response_time
            response = server.requests.Response()
            response.status_code = status
            response.url = request.url
            response.request = request
            response._content = b"configuration detail"
            response._content_consumed = True
            if location:
                response.headers["Location"] = location
            return response

        monkeypatch.setattr(server.requests.adapters.HTTPAdapter, "send", send)
        monkeypatch.setattr(
            server,
            "HTTPConnection",
            partial(_mock_direct_probe, clock=clock, sent=sent, responses=responses),
        )
        with pytest.raises(SystemExit) as exit_info:
            cli.status.callback()
        return exit_info.value.code, sent

    return run


LOOPBACK_STATUS = "http://127.0.0.1:8080/kolibri/status/"
LAN_STATUS = "http://10.0.0.5:8080/kolibri/status/"
REDIRECT_STATUS = "http://127.0.0.1:8080/redirected/"


def test_status_does_not_retry_loopback_404_after_deadline(run_status):
    assert run_status([(404, None)], response_time=3) == (
        cli.server.STATUS_UNKNOWN_INSTANCE,
        [LOOPBACK_STATUS],
    )


def _mock_status_socket(monkeypatch, client):
    transport = Mock(wraps=client)
    transport.setsockopt = Mock()
    monkeypatch.setattr(socket, "create_connection", Mock(return_value=transport))
    return transport


def test_status_deadline_includes_trickled_alternate_headers(monkeypatch):
    server = cli.server
    loopback = server.requests.Response()
    loopback.status_code = 404
    elapsed = 0

    def loopback_probe(*args, **kwargs):
        nonlocal elapsed
        elapsed = 2.7
        return loopback

    monkeypatch.setattr(
        server, "time", SimpleNamespace(monotonic=lambda: monotonic() + elapsed)
    )
    monkeypatch.setattr(server.requests, "get", loopback_probe)
    stop = threading.Event()
    end_of_headers = threading.Event()
    client, listener = socket.socketpair()
    with closing(client), closing(listener):
        transport = _mock_status_socket(monkeypatch, client)
        listener.sendall(b"HTTP/1.1 200 OK\r\n")

        def trickle_headers():
            for header in (b"X-Test: 1\r\n",) * 8 + (b"\r\n",):
                if stop.wait(0.08):
                    return
                if header == b"\r\n":
                    end_of_headers.set()
                try:
                    listener.sendall(header)
                except OSError:
                    return

        sender = threading.Thread(target=trickle_headers)
        sender.start()
        try:
            assert server._get_cherrypy_status_response(
                LOOPBACK_STATUS, "127.0.0.2", 8080, "/kolibri/"
            ) == (404, loopback)
            transport.shutdown.assert_called_once_with(socket.SHUT_RDWR)
            assert not end_of_headers.is_set()
        finally:
            stop.set()
            sender.join()


def test_status_surfaces_loopback_server_error(run_status, capsys):
    assert run_status([(500, None), cli.server.requests.ConnectionError()]) == (
        9,
        [LOOPBACK_STATUS, LAN_STATUS],
    )
    assert "configuration detail" in capsys.readouterr().err


@pytest.mark.parametrize("alternate_status", [404, 503])
def test_status_preserves_loopback_detail_after_alternate_error(
    run_status, capsys, alternate_status
):
    assert run_status([(500, None), (alternate_status, None)]) == (
        9,
        [LOOPBACK_STATUS, LAN_STATUS],
    )
    assert "configuration detail" in capsys.readouterr().err


def test_status_preserves_loopback_error_when_adapter_lookup_fails(run_status, capsys):
    with patch.object(cli.server.ifaddr, "get_adapters", side_effect=OSError):
        assert run_status([(503, None)]) == (9, [LOOPBACK_STATUS])
    assert "configuration detail" in capsys.readouterr().err


def test_status_reports_not_responding_when_adapter_name_cannot_be_decoded(
    run_status, capsys
):
    decode_error = UnicodeDecodeError("utf-8", b"veth\xff", 4, 5, "invalid byte")
    with patch.object(cli.server.ifaddr, "get_adapters", side_effect=decode_error):
        assert run_status([cli.server.requests.ConnectionError()]) == (
            5,
            [LOOPBACK_STATUS],
        )
    assert capsys.readouterr().err == "Not responding (5)\n"


def test_status_does_not_probe_unassigned_address(run_status):
    assert run_status(
        [cli.server.requests.ConnectionError()], bind_address="10.0.0.8"
    ) == (
        5,
        [LOOPBACK_STATUS],
    )


def test_status_probes_pid_owners_address_not_callers_address(run_status, monkeypatch):
    monkeypatch.setitem(
        cli.server.conf.OPTIONS["Deployment"], "LISTEN_ADDRESS", "10.0.0.6"
    )
    assert run_status(
        [cli.server.requests.ConnectionError(), cli.server.requests.ConnectionError()]
    ) == (5, [LOOPBACK_STATUS, LAN_STATUS])


def test_status_does_not_guess_address_for_legacy_pid_file(run_status):
    assert run_status([cli.server.requests.ConnectionError()], bind_address=None) == (
        5,
        [LOOPBACK_STATUS],
    )


def test_status_ignores_bind_metadata_for_different_pid(run_status, tmp_path):
    (tmp_path / "server.pid.bind").write_text(f"{os.getpid() + 1}\n10.0.0.5\n")
    assert run_status([cli.server.requests.ConnectionError()], bind_address=None) == (
        5,
        [LOOPBACK_STATUS],
    )


def test_status_does_not_probe_lan_after_loopback_timeout(run_status):
    assert run_status([cli.server.requests.exceptions.ReadTimeout()]) == (
        5,
        [LOOPBACK_STATUS],
    )


def test_status_keeps_loopback_404_after_alternate_refusal(run_status):
    assert run_status([(404, None), cli.server.requests.ConnectionError()]) == (
        8,
        [LOOPBACK_STATUS, LAN_STATUS],
    )


def test_status_does_not_read_alternate_error_body(monkeypatch, capsys):
    server = cli.server
    loopback = server.requests.Response()
    loopback.status_code = 404
    monkeypatch.setattr(server.requests, "get", Mock(return_value=loopback))

    client, listener = socket.socketpair()
    with closing(client), closing(listener):
        transport = _mock_status_socket(monkeypatch, client)
        listener.sendall(
            b"HTTP/1.1 503 Service Unavailable\r\nContent-Length: 1\r\n\r\n"
        )

        with pytest.raises(server.NotRunning) as error:
            server._check_cherrypy_status(
                LOOPBACK_STATUS, "127.0.0.2", 8080, "/kolibri/"
            )

        assert error.value.status_code == server.STATUS_SERVER_CONFIGURATION_ERROR
        transport.shutdown.assert_not_called()
    assert "HTTP 503" in capsys.readouterr().err


def test_status_does_not_probe_lan_after_redirected_refusal(run_status):
    assert run_status(
        [(302, REDIRECT_STATUS), cli.server.requests.ConnectionError()]
    ) == (5, [LOOPBACK_STATUS, REDIRECT_STATUS])


def test_status_does_not_probe_lan_after_proxy_refusal(run_status, monkeypatch):
    proxy = "http://proxy.example:3128"
    monkeypatch.setenv("http_proxy", proxy)
    monkeypatch.setenv("no_proxy", "example.invalid")
    assert run_status(
        [cli.server.requests.ConnectionError(), (403, None)],
        proxy=proxy,
    ) == (
        5,
        [LOOPBACK_STATUS],
    )


def test_status_external_server_does_not_probe_lan_after_refusal(run_status):
    assert run_status(
        [cli.server.requests.ConnectionError()], cherrypy_start=False
    ) == (5, [LOOPBACK_STATUS])


def test_status_does_not_follow_alternate_listener_redirect(run_status):
    assert run_status(
        [cli.server.requests.ConnectionError(), (302, REDIRECT_STATUS)]
    ) == (9, [LOOPBACK_STATUS, LAN_STATUS])


def test_stop_no_db_access():
    """
    Tests that stop does not try to access the database
    """
    with patch(DJANGO_CONNECT) as connect_mock:
        try:
            cli.stop.callback()
        except SystemExit:
            pass
    connect_mock.assert_not_called()


@patch("kolibri.utils.conf.OPTIONS")
def test_import_no_options_evaluation(options_mock):
    # Reimporting rebinds kolibri.utils.cli; restore both it and sys.modules.
    with patch.dict(sys.modules), patch("kolibri.utils.cli", cli):
        # Evict the module-level import so the module body runs again.
        del sys.modules["kolibri.utils.cli"]
        importlib.import_module("kolibri.utils.cli")
    options_mock.__getitem__.assert_not_called()
