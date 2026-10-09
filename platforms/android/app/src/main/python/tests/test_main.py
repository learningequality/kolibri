"""Port reuse on restart — see main._resolve_server_port."""

import socket
from contextlib import contextmanager
from unittest import mock

import main

from kolibri.utils import conf

LISTEN_ADDRESS = conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"]


@contextmanager
def _occupied_port():
    """A port held for the duration of the block."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind((LISTEN_ADDRESS, 0))
        yield sock.getsockname()[1]


def _free_port():
    """A port that has just been released, so it is bindable again."""
    with _occupied_port() as port:
        return port


def test_resolve_server_port_reuses_a_free_port():
    port = _free_port()
    assert main._resolve_server_port(port) == port


def test_resolve_server_port_falls_back_when_the_port_is_taken():
    # Held without listening: what the kernel hands to another app's outbound
    # connection while our server is down, and what a listener probe reports free.
    with _occupied_port() as port:
        assert main._resolve_server_port(port) == 0


def test_resolve_server_port_defers_to_options_when_there_is_no_port():
    assert main._resolve_server_port(0) is None
    assert main._resolve_server_port(None) is None


def test_bus_with_no_port_ends_up_on_the_http_port_option():
    with (
        mock.patch.dict(conf.OPTIONS["Deployment"], {"HTTP_PORT": 4321}),
        mock.patch.object(main.AndroidKolibriProcessBus, "_setup_plugins"),
    ):
        bus = main.AndroidKolibriProcessBus(port=main._resolve_server_port(0))
    assert bus.port == 4321
