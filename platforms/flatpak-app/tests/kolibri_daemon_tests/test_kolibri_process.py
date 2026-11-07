import signal
import threading
import unittest
from unittest import mock

from kolibri.dist.magicbus.plugins.servers import ServerPlugin
from kolibri.utils import server
from kolibri_daemon.kolibri_process import KolibriDaemonProcess


class _RecordingApplication:
    def __init__(self, autostart=True):
        self.autostart = autostart
        self.detach_count = 0
        self.kolibri = None
        self.state = None

    def attach_kolibri(self, kolibri):
        self.kolibri = kolibri
        if self.autostart:
            kolibri.start()

    def detach_kolibri(self):
        self.detach_count += 1

    def update_kolibri_state(self, state):
        self.state = state


class _BlockingHTTPServer:
    def __init__(self):
        self.ready = False
        self.thread = None
        self.__stopped = threading.Event()

    def start(self):
        self.thread = threading.current_thread()
        self.ready = True
        self.__stopped.wait()

    def stop(self):
        self.__stopped.set()
        if self.thread is not None:
            self.thread.join()


# Signal handlers only run on the main thread, which unittest runs tests on.
class TestKolibriDaemonProcess(unittest.TestCase):
    def setUp(self):
        for patcher in (
            *(
                mock.patch.object(server, name)
                for name in (
                    "KolibriServerPlugin",
                    "ZipContentServerPlugin",
                    "ServicesPlugin",
                    "ZeroConfPlugin",
                    "PIDPlugin",
                    "LogPlugin",
                )
            ),
            mock.patch.object(
                server.SystemdNotifyPlugin, "is_supported", return_value=False
            ),
            mock.patch("kolibri_daemon.kolibri_process.app_initialize_url"),
            mock.patch(
                "kolibri_daemon.kolibri_process.device_provisioned", return_value=True
            ),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)
        # The bus installs process-wide handlers at ENTER.
        for signum in (signal.SIGTERM, signal.SIGHUP, signal.SIGUSR1, signal.SIGINT):
            self.addCleanup(signal.signal, signum, signal.getsignal(signum))

    def _make_bus(self, autostart=True):
        application = _RecordingApplication(autostart)
        bus = KolibriDaemonProcess(application)
        httpserver = _BlockingHTTPServer()
        self.addCleanup(httpserver.stop)
        ServerPlugin(bus, httpserver).subscribe()
        return application, bus, httpserver

    def test_sigterm_during_start_stops_server(self):
        application, bus, httpserver = self._make_bus()
        # Runs before ServerPlugin.START at priority 75.
        bus.subscribe("START", lambda: signal.raise_signal(signal.SIGTERM))
        run = mock.Mock()
        bus.subscribe("RUN", run)

        bus.run()

        self.assertFalse(httpserver.thread.is_alive())
        self.assertEqual(application.detach_count, 1)
        run.assert_not_called()

    def test_sigterm_supersedes_queued_start(self):
        application, bus, httpserver = self._make_bus(autostart=False)

        def start_then_sigterm():
            application.kolibri.start()
            signal.raise_signal(signal.SIGTERM)

        bus.subscribe("IDLE", start_then_sigterm)

        bus.run()

        self.assertIsNone(httpserver.thread)
        self.assertEqual(application.detach_count, 1)

    def test_exit_runs_queued_start_first(self):
        application, bus, httpserver = self._make_bus()
        # After _DBusPlugin.ENTER attaches the application, which queues Start.
        bus.subscribe("ENTER", lambda: application.kolibri.exit(), priority=60)

        bus.run()

        self.assertFalse(httpserver.thread.is_alive())
        self.assertEqual(application.detach_count, 1)

    def test_serving_publishes_loopback_urls(self):
        application, bus, _ = self._make_bus()

        ifaddr = server.ifaddr
        lan = ifaddr.Adapter("eth0", "eth0", [ifaddr.IP("192.0.2.7", 24, "eth0")])
        with mock.patch.object(ifaddr, "get_adapters", return_value=[lan]):
            bus.publish("SERVING", 8080)
            bus.publish("ZIP_SERVING", 8081)

        self.assertEqual(application.state.base_url, "http://127.0.0.1:8080/")
        self.assertEqual(application.state.extra_url, "http://127.0.0.1:8081/")
