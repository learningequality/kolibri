"""Port reuse on restart — see main._resolve_server_port."""

import queue
import socket
import threading
import time
from contextlib import contextmanager
from unittest import mock

import main
from django.test import TransactionTestCase

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


class _StopRequest:
    def __init__(self, requested):
        self.requested = requested

    def get(self):
        return self.requested


@contextmanager
def _real_buses():
    buses = queue.Queue()
    real_init = main.AndroidKolibriProcessBus.__init__

    def recording_init(self, *args, **kwargs):
        real_init(self, *args, **kwargs)
        buses.put(self)

    with (
        mock.patch.object(main.AndroidKolibriProcessBus, "_setup_plugins"),
        mock.patch.object(
            main.AndroidKolibriProcessBus, "__init__", recording_init
        ),
        mock.patch.object(main, "KolibriServerViewModel") as view_model,
    ):
        yield buses, view_model


def _start_in_thread(stop_requested=False):
    thread = threading.Thread(
        target=main.start_server,
        args=(0, _StopRequest(stop_requested)),
        daemon=True,
    )
    thread.start()
    return thread


def _wait_for_state(bus, state):
    for _ in range(50):
        if bus.state == state:
            return
        time.sleep(0.1)
    raise AssertionError(f"bus never reached {state}, is {bus.state}")


class StartServerTest(TransactionTestCase):
    def test_start_server_does_not_serve_once_a_stop_was_requested(self):
        with _real_buses() as (buses, _):
            thread = _start_in_thread(stop_requested=True)
            bus = buses.get(timeout=5)
            thread.join(timeout=5)
            try:
                self.assertFalse(thread.is_alive())
                self.assertNotEqual(bus.state, "RUN")
            finally:
                bus.transition("EXITED")
                thread.join(timeout=5)
        with self.assertRaises(RuntimeError):
            main.get_initialize_url()

    def test_a_slow_stop_does_not_orphan_the_server_started_after_it(self):
        second_started = threading.Event()
        with _real_buses() as (buses, view_model):
            first_thread = _start_in_thread()
            first = buses.get(timeout=5)
            _wait_for_state(first, "RUN")
            # magicbus 4.1.2's block() publishes execv after EXITED, before run() returns.
            first.subscribe("execv", lambda: second_started.wait(timeout=5))

            main.stop_server()
            second_thread = _start_in_thread()
            second = buses.get(timeout=5)
            _wait_for_state(second, "RUN")
            second_started.set()
            first_thread.join(timeout=5)

            view_model.getInstance().resetServerState.assert_not_called()
            main.stop_server()
            second_thread.join(timeout=5)
            self.assertFalse(second_thread.is_alive())
        with self.assertRaises(RuntimeError):
            main.get_initialize_url()
