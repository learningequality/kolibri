import errno
import os
import socket
import sys
from types import SimpleNamespace

import pytest
from configobj import ConfigObj

from kolibri.utils import port_election

TCP_HEADER = "  sl  local_address rem_address   st tx_queue rx_queue tr tm->when retrnsmt   uid  timeout inode\n"


def _tcp_row(port, state, inode, uid=0):
    return f"   0: 00000000:{port:04X} 00000000:0000 {state} 00000000:00000000 00:00000000 00000000 {uid:>5}        0 {inode} 1 0000000000000000 100 0 0 10 0\n"


def _nginx_on_port_80(proc, cgroup="0::/system.slice/nginx.service\n"):
    (proc / "net").mkdir(parents=True)
    (proc / "net" / "tcp").write_text(TCP_HEADER + _tcp_row(22, "0A", 111))
    (proc / "net" / "tcp6").write_text(TCP_HEADER + _tcp_row(80, "0A", 222))
    (proc / "20" / "fd").mkdir(parents=True)
    os.symlink("socket:[222]", proc / "20" / "fd" / "3")
    (proc / "20" / "comm").write_text("nginx\n")
    (proc / "20" / "cgroup").write_text(cgroup)


@pytest.fixture
def ini_path(tmp_path, monkeypatch):
    monkeypatch.delenv("KOLIBRI_HTTP_PORT", raising=False)
    monkeypatch.delenv("KOLIBRI_LISTEN_PORT", raising=False)
    path = tmp_path / "options.ini"
    path.write_text("\n")
    return str(path)


@pytest.fixture
def probes(monkeypatch, tmp_path):
    recorded = SimpleNamespace(bound=[], errors={})

    class FakeSocket:
        def __init__(self, family, type_):
            pass

        def setsockopt(self, *args):
            pass

        def bind(self, address):
            recorded.bound.append(address)
            error = recorded.errors.get(address[1])
            if error:
                raise OSError(error, os.strerror(error))

        def close(self):
            pass

    monkeypatch.setattr(socket, "socket", FakeSocket)
    monkeypatch.setattr(port_election, "PROCFS_PATH", str(tmp_path / "proc"))
    return recorded


def _pinned_port(ini_path):
    return ConfigObj(ini_path).get("Deployment", {}).get("HTTP_PORT")


def test_pins_preferred_port_when_bindable(ini_path, probes):
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert _pinned_port(ini_path) == "80"


def test_probes_listen_address(ini_path, probes):
    with open(ini_path, "w") as f:
        f.write("[Deployment]\nLISTEN_ADDRESS = 10.0.0.5\n")
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert probes.bound == [("10.0.0.5", 80)]


@pytest.mark.skipif(sys.platform == "win32", reason="fake procfs needs symlinks")
@pytest.mark.parametrize("error", [errno.EADDRINUSE, errno.EACCES])
def test_busy_port_falls_back_and_names_occupant(
    ini_path, probes, tmp_path, caplog, error
):
    probes.errors[80] = error
    _nginx_on_port_80(tmp_path / "proc")

    port_election.elect_http_port(80, ini_filename=ini_path)

    assert _pinned_port(ini_path) == "8080"
    assert "Port 80 is in use by nginx (nginx.service)" in caplog.text


@pytest.mark.skipif(sys.platform == "win32", reason="fake procfs needs symlinks")
def test_busy_port_in_session_scope_names_process_only(
    ini_path, probes, tmp_path, caplog
):
    probes.errors[80] = errno.EADDRINUSE
    _nginx_on_port_80(
        tmp_path / "proc",
        cgroup="0::/user.slice/user-1000.slice/user@1000.service/app.slice/app-gnome-terminal-1234.scope\n",
    )

    port_election.elect_http_port(80, ini_filename=ini_path)

    assert "Port 80 is in use by nginx\n" in caplog.text


@pytest.mark.skipif(sys.platform == "win32", reason="no pwd module")
def test_busy_port_with_unreadable_process_names_owning_user(
    ini_path, probes, tmp_path, caplog
):
    probes.errors[80] = errno.EADDRINUSE
    proc = tmp_path / "proc"
    (proc / "net").mkdir(parents=True)
    (proc / "net" / "tcp").write_text(TCP_HEADER + _tcp_row(80, "0A", 222, uid=0))
    (proc / "net" / "tcp6").write_text(TCP_HEADER)

    port_election.elect_http_port(80, ini_filename=ini_path)

    assert _pinned_port(ini_path) == "8080"
    assert "Port 80 is in use by a process of user root" in caplog.text


def test_busy_port_without_procfs_reports_unnamed(ini_path, probes, caplog):
    probes.errors[80] = errno.EADDRINUSE
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert _pinned_port(ini_path) == "8080"
    assert "Port 80 is in use" in caplog.text


def test_privileged_port_falls_back_and_reports_permission(ini_path, probes, caplog):
    probes.errors[80] = errno.EACCES
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert _pinned_port(ini_path) == "8080"
    assert "permission denied" in caplog.text


def test_explicit_port_in_options_file_is_kept(ini_path, probes):
    with open(ini_path, "w") as f:
        f.write("[Deployment]\nHTTP_PORT = 9000\n")
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert probes.bound == []
    assert _pinned_port(ini_path) == "9000"


@pytest.mark.parametrize("envvar", ["KOLIBRI_HTTP_PORT", "KOLIBRI_LISTEN_PORT"])
def test_explicit_port_in_env_is_kept(ini_path, probes, monkeypatch, envvar):
    monkeypatch.setenv(envvar, "9000")
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert probes.bound == []
    assert _pinned_port(ini_path) is None


def test_nothing_bindable_pins_nothing(ini_path, probes):
    probes.errors[80] = errno.EADDRINUSE
    probes.errors[8080] = errno.EADDRINUSE
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert _pinned_port(ini_path) is None
