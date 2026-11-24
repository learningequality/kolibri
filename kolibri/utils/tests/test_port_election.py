import errno
import os
import sys

import pytest

from kolibri.utils import port_election
from kolibri.utils.tests.helpers import fake_nginx_on_port_80
from kolibri.utils.tests.helpers import fake_port_binds
from kolibri.utils.tests.helpers import pinned_http_port
from kolibri.utils.tests.helpers import TCP_HEADER
from kolibri.utils.tests.helpers import tcp_row


def _root_listener_on_port_80(proc):
    (proc / "net").mkdir(parents=True)
    (proc / "net" / "tcp").write_text(TCP_HEADER + tcp_row(80, "0A", 222, uid=0))
    (proc / "net" / "tcp6").write_text(TCP_HEADER)


@pytest.fixture
def ini_path(tmp_path, monkeypatch):
    monkeypatch.delenv("KOLIBRI_HTTP_PORT", raising=False)
    monkeypatch.delenv("KOLIBRI_LISTEN_PORT", raising=False)
    path = tmp_path / "options.ini"
    path.write_text("\n")
    return str(path)


@pytest.fixture
def probes(monkeypatch, tmp_path):
    recorded = fake_port_binds(monkeypatch)
    monkeypatch.setattr(port_election, "PROCFS_PATH", str(tmp_path / "proc"))
    return recorded


def test_pins_preferred_port_when_bindable(ini_path, probes):
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert pinned_http_port(ini_path) == "80"


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
    fake_nginx_on_port_80(tmp_path / "proc")

    port_election.elect_http_port(80, ini_filename=ini_path)

    assert pinned_http_port(ini_path) == "8080"
    assert "Port 80 is in use by nginx (nginx.service)" in caplog.text


@pytest.mark.skipif(sys.platform == "win32", reason="fake procfs needs symlinks")
def test_busy_port_in_session_scope_names_process_only(
    ini_path, probes, tmp_path, caplog
):
    probes.errors[80] = errno.EADDRINUSE
    fake_nginx_on_port_80(
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
    _root_listener_on_port_80(tmp_path / "proc")

    port_election.elect_http_port(80, ini_filename=ini_path)

    assert pinned_http_port(ini_path) == "8080"
    assert "Port 80 is in use by a process of user root" in caplog.text


def test_busy_port_without_procfs_reports_unnamed(ini_path, probes, caplog):
    probes.errors[80] = errno.EADDRINUSE
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert pinned_http_port(ini_path) == "8080"
    assert "Port 80 is in use\n" in caplog.text


def test_privileged_port_falls_back_and_reports_permission(ini_path, probes, caplog):
    probes.errors[80] = errno.EACCES
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert pinned_http_port(ini_path) == "8080"
    assert "permission denied" in caplog.text


def test_unset_election_keeps_explicit_port_in_options_file(ini_path, probes):
    with open(ini_path, "w") as f:
        f.write("[Deployment]\nHTTP_PORT = 9000\n")
    port_election.elect_unset_http_port(ini_filename=ini_path)
    assert probes.bound == []
    assert pinned_http_port(ini_path) == "9000"


@pytest.mark.parametrize("envvar", ["KOLIBRI_HTTP_PORT", "KOLIBRI_LISTEN_PORT"])
def test_unset_election_keeps_explicit_port_in_env(
    ini_path, probes, monkeypatch, envvar
):
    monkeypatch.setenv(envvar, "9000")
    port_election.elect_unset_http_port(ini_filename=ini_path)
    assert probes.bound == []
    assert pinned_http_port(ini_path) is None


@pytest.mark.parametrize("envvar", ["KOLIBRI_HTTP_PORT", "KOLIBRI_LISTEN_PORT"])
def test_election_pins_port_despite_env(ini_path, probes, monkeypatch, envvar):
    monkeypatch.setenv(envvar, "9000")
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert pinned_http_port(ini_path) == "80"


def test_nothing_bindable_pins_nothing(ini_path, probes):
    probes.errors[80] = errno.EADDRINUSE
    probes.errors[8080] = errno.EADDRINUSE
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert pinned_http_port(ini_path) is None


def test_nothing_bindable_keeps_pinned_http_port(ini_path, probes, caplog):
    with open(ini_path, "w") as f:
        f.write("[Deployment]\nHTTP_PORT = 9000\n")
    probes.errors[80] = errno.EADDRINUSE
    probes.errors[8080] = errno.EADDRINUSE
    port_election.elect_http_port(80, ini_filename=ini_path)
    assert pinned_http_port(ini_path) == "9000"
    assert "None of ports 80, 8080 could be bound; HTTP_PORT unchanged" in caplog.text


def test_claim_pins_bindable_port(ini_path, probes):
    assert port_election.claim_http_port(8081, ini_filename=ini_path) is None
    assert pinned_http_port(ini_path) == "8081"


@pytest.mark.skipif(sys.platform == "win32", reason="fake procfs needs symlinks")
def test_claim_of_busy_port_names_occupant_without_fallback(ini_path, probes, tmp_path):
    probes.errors[80] = errno.EADDRINUSE
    fake_nginx_on_port_80(tmp_path / "proc")

    failure = port_election.claim_http_port(80, ini_filename=ini_path)

    assert failure == (port_election.IN_USE_BY_PROCESS, "nginx (nginx.service)")
    assert pinned_http_port(ini_path) is None
    assert [port for _, port in probes.bound] == [80]


@pytest.mark.skipif(sys.platform == "win32", reason="no pwd module")
def test_claim_of_port_held_by_unreadable_process_names_user(
    ini_path, probes, tmp_path
):
    probes.errors[80] = errno.EADDRINUSE
    _root_listener_on_port_80(tmp_path / "proc")

    failure = port_election.claim_http_port(80, ini_filename=ini_path)

    assert failure == (port_election.IN_USE_BY_USER, "root")


def test_claim_of_busy_port_without_procfs_is_unnamed(ini_path, probes):
    probes.errors[80] = errno.EADDRINUSE
    failure = port_election.claim_http_port(80, ini_filename=ini_path)
    assert failure == (port_election.IN_USE, None)


def test_claim_of_privileged_port_reports_permission(ini_path, probes):
    probes.errors[80] = errno.EACCES
    failure = port_election.claim_http_port(80, ini_filename=ini_path)
    assert failure == (port_election.PERMISSION_DENIED, None)
    assert pinned_http_port(ini_path) is None


def test_claim_of_unbindable_port_carries_os_message(ini_path, probes):
    probes.errors[80] = errno.EADDRNOTAVAIL
    failure = port_election.claim_http_port(80, ini_filename=ini_path)
    assert failure == (port_election.UNAVAILABLE, os.strerror(errno.EADDRNOTAVAIL))


def test_claim_of_serving_port_pins_without_binding(ini_path, probes):
    probes.errors[8081] = errno.EADDRINUSE
    failure = port_election.claim_http_port(
        8081, ini_filename=ini_path, serving_port=8081
    )
    assert failure is None
    assert probes.bound == []
    assert pinned_http_port(ini_path) == "8081"
