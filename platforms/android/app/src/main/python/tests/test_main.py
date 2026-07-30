"""Port reuse on restart — see main._resolve_server_port."""

import socket
from contextlib import contextmanager

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


def test_resolve_server_port_leaves_zero_alone():
    assert main._resolve_server_port(0) == 0
