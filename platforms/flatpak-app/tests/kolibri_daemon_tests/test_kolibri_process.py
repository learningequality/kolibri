import signal
import threading
import unittest
from unittest import mock

from kolibri.dist.magicbus.plugins.servers import ServerPlugin
from kolibri.utils import server
from kolibri.utils.conf import OPTIONS
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


class _ZipHTTPServer(_BlockingHTTPServer):
    def start(self):
        host, _ = self.bind_addr
        self.bind_addr = host, 8765
        super().start()


# Signal handlers only run on the main thread, which unittest runs tests on.
class TestKolibriDaemonProcess(unittest.TestCase):
    def setUp(self):
        for patcher in (
            *(
                mock.patch.object(server, name)
                for name in (
                    "KolibriServerPlugin",
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

    def _make_bus(self, autostart=True, zip_plugin=mock.DEFAULT):
        application = _RecordingApplication(autostart)
        with mock.patch.object(server, "ZipContentServerPlugin", zip_plugin):
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

    def test_zip_url_keeps_bound_origin_when_advertising(self):
        zip_server = _ZipHTTPServer()
        self.addCleanup(zip_server.stop)
        extra_urls = []
        server_plugins = server.BaseServerPlugin.__module__

        def capture_url_and_exit():
            extra_urls.append(application.state.extra_url)
            application.kolibri.exit()

        with (
            mock.patch.dict(
                OPTIONS["Deployment"],
                LISTEN_ADDRESS="127.0.0.1",
                ADVERTISED_HTTP_PORT=80,
                URL_PATH_PREFIX="kolibri/",
                ZIP_CONTENT_PORT=0,
            ),
            mock.patch.object(server, "Server", return_value=zip_server),
            mock.patch.object(server.ZipContentServerPlugin, "application", None),
            mock.patch(f"{server_plugins}.wait_for_free_port"),
            mock.patch(f"{server_plugins}.wait_for_occupied_port"),
        ):
            application, bus, _httpserver = self._make_bus(
                zip_plugin=server.ZipContentServerPlugin
            )
            bus.subscribe("RUN", capture_url_and_exit)
            bus.run()

        self.assertEqual(extra_urls, ["http://127.0.0.1:8765/"])
