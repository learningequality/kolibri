import tempfile
import threading
import unittest
from concurrent.futures import Future
from pathlib import Path

from gi.repository import Gio
from gi.repository import GLib
from gi.repository import KolibriDaemonDBus

from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_MAIN_OBJECT_PATH
from kolibri_daemon.application import Application
from kolibri_daemon.kolibri_search_handler import SearchHandler

CALL_TIMEOUT_MS = 5000
SHORT_INACTIVITY_TIMEOUT_MS = 100


class _PendingSearchHandler(SearchHandler):
    def __init__(self):
        self.future = Future()
        self.searched = threading.Event()

    def get_item_ids_for_search(self, search: str) -> Future:
        self.searched.set()
        return self.future

    def get_metadata_for_item_ids(self, item_ids: list) -> Future:
        return self.future


class _RecordingKolibri:
    def __init__(self):
        self.start_count = 0
        self.exit_count = 0

    def start(self):
        self.start_count += 1

    def stop(self):
        pass

    def exit(self):
        self.exit_count += 1


# Run under tests/dbus-session.conf, which has no .service files. The
# application thread owns the default main context, so this thread only makes
# synchronous D-Bus calls.
class TestApplication(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.updated_marker = Path(tmp.name, ".updated")

    def _run_application(self, search_handler=None):
        application = Application(
            search_handler or _PendingSearchHandler(),
            updated_marker_path=self.updated_marker,
        )
        thread, _exit_status = self._start_application(application)
        return application, thread

    def _start_application(self, application):
        exit_status = []
        thread = threading.Thread(
            target=lambda: exit_status.append(
                application.run(["kolibri-daemon", "--session"])
            )
        )
        thread.start()
        self.addCleanup(thread.join)
        self.addCleanup(GLib.idle_add, application.quit)
        return thread, exit_status

    def _private_connection(self):
        connection = Gio.DBusConnection.new_for_address_sync(
            Gio.dbus_address_get_for_bus_sync(Gio.BusType.SESSION, None),
            Gio.DBusConnectionFlags.AUTHENTICATION_CLIENT
            | Gio.DBusConnectionFlags.MESSAGE_BUS_CONNECTION,
            None,
            None,
        )
        self.addCleanup(lambda: connection.is_closed() or connection.close_sync(None))
        return connection

    def _own_bus_name_elsewhere(self):
        # GApplication counts a name its own connection already owns as primary.
        connection = self._private_connection()

        def call_bus(method, parameters):
            connection.call_sync(
                "org.freedesktop.DBus",
                "/org/freedesktop/DBus",
                "org.freedesktop.DBus",
                method,
                parameters,
                None,
                Gio.DBusCallFlags.NONE,
                CALL_TIMEOUT_MS,
                None,
            )

        call_bus("RequestName", GLib.Variant("(su)", (DAEMON_APPLICATION_ID, 0)))
        # The bus drops a closed connection's names asynchronously.
        self.addCleanup(
            call_bus, "ReleaseName", GLib.Variant("(s)", (DAEMON_APPLICATION_ID,))
        )

    def _proxy(self, connection=None):
        proxy = KolibriDaemonDBus.MainProxy(
            g_connection=connection or Gio.bus_get_sync(Gio.BusType.SESSION, None),
            g_flags=Gio.DBusProxyFlags.DO_NOT_AUTO_START,
            g_name=DAEMON_APPLICATION_ID,
            g_object_path=DAEMON_MAIN_OBJECT_PATH,
            g_interface_name=KolibriDaemonDBus.main_interface_info().name,
        )
        proxy.init(None)
        return proxy

    def _call(self, proxy, method):
        proxy.call_sync(method, None, Gio.DBusCallFlags.NONE, CALL_TIMEOUT_MS, None)

    def _search(self, proxy):
        return proxy.call_sync(
            "GetItemIdsForSearch",
            GLib.Variant("(s)", ("maths",)),
            Gio.DBusCallFlags.NONE,
            CALL_TIMEOUT_MS,
            None,
        )

    def test_serves_interface_before_kolibri_attaches(self):
        application, _thread = self._run_application()
        self.assertTrue(application.await_bus_name())

        proxy = self._proxy()
        self._call(proxy, "Hold")
        self.assertEqual(proxy.props.status, "STOPPED")
        self._call(proxy, "Start")

    def test_start_before_kolibri_attaches_starts_it_on_attach(self):
        application, _thread = self._run_application()
        self.assertTrue(application.await_bus_name())
        proxy = self._proxy()

        self._call(proxy, "Start")
        kolibri = _RecordingKolibri()
        application.attach_kolibri(kolibri)
        self.assertEqual(kolibri.start_count, 1)

    def test_stop_before_kolibri_attaches_cancels_start(self):
        application, _thread = self._run_application()
        self.assertTrue(application.await_bus_name())
        proxy = self._proxy()

        self._call(proxy, "Start")
        self._call(proxy, "Stop")
        kolibri = _RecordingKolibri()
        application.attach_kolibri(kolibri)
        self.assertEqual(kolibri.start_count, 0)

    def test_search_does_not_block_the_interface(self):
        search_handler = _PendingSearchHandler()
        application, _thread = self._run_application(search_handler)
        self.assertTrue(application.await_bus_name())
        proxy = self._proxy()

        results = []
        search_thread = threading.Thread(
            target=lambda: results.append(self._search(proxy))
        )
        search_thread.start()
        self.assertTrue(search_handler.searched.wait(CALL_TIMEOUT_MS / 1000))

        proxy.call_sync("Hold", None, Gio.DBusCallFlags.NONE, 2000, None)

        search_handler.future.set_result(["c/node?channel"])
        search_thread.join()
        self.assertEqual(results[0].unpack(), (["c/node?channel"],))

    def test_failed_search_returns_an_error(self):
        search_handler = _PendingSearchHandler()
        search_handler.future.set_exception(ValueError("boom"))
        application, _thread = self._run_application(search_handler)
        self.assertTrue(application.await_bus_name())

        with self.assertRaises(GLib.Error) as raised:
            self._search(self._proxy())
        self.assertFalse(
            raised.exception.matches(Gio.io_error_quark(), Gio.IOErrorEnum.TIMED_OUT)
        )

    def test_quitting_tells_kolibri_to_exit(self):
        application, thread = self._run_application()
        self.assertTrue(application.await_bus_name())
        kolibri = _RecordingKolibri()
        application.attach_kolibri(kolibri)

        GLib.idle_add(application.quit)
        thread.join()
        self.assertEqual(kolibri.exit_count, 1)

        late_kolibri = _RecordingKolibri()
        application.attach_kolibri(late_kolibri)
        self.assertEqual(late_kolibri.exit_count, 1)

    def test_stays_up_until_kolibri_attaches(self):
        application = Application(_PendingSearchHandler())
        application.set_inactivity_timeout(SHORT_INACTIVITY_TIMEOUT_MS)
        thread, _exit_status = self._start_application(application)
        self.assertTrue(application.await_bus_name())

        # Until its first release, an IS_SERVICE GApplication times out after a
        # fixed 10 s rather than its inactivity timeout.
        self._call(self._proxy(), "Release")
        thread.join(SHORT_INACTIVITY_TIMEOUT_MS * 5 / 1000)
        self.assertTrue(thread.is_alive())

        application.attach_kolibri(_RecordingKolibri())
        thread.join(CALL_TIMEOUT_MS / 1000)
        self.assertFalse(thread.is_alive())

    def test_update_without_clients_exits(self):
        application, thread = self._run_application()
        self.assertTrue(application.await_bus_name())
        kolibri = _RecordingKolibri()
        application.attach_kolibri(kolibri)

        self.updated_marker.touch()
        thread.join(CALL_TIMEOUT_MS / 1000)
        self.assertFalse(thread.is_alive())
        self.assertEqual(kolibri.exit_count, 1)

    def test_update_waits_for_every_client_that_held_before_it(self):
        application, thread = self._run_application()
        self.assertTrue(application.await_bus_name())
        application.attach_kolibri(_RecordingKolibri())
        client_a = self._proxy()
        client_b_connection = self._private_connection()
        self._call(client_a, "Hold")
        self._call(self._proxy(client_b_connection), "Hold")

        self.updated_marker.touch()
        self._call(client_a, "Release")
        thread.join(SHORT_INACTIVITY_TIMEOUT_MS * 5 / 1000)
        self.assertTrue(thread.is_alive())

        client_b_connection.close_sync(None)
        thread.join(CALL_TIMEOUT_MS / 1000)
        self.assertFalse(thread.is_alive())

    def test_client_holding_after_update_does_not_keep_daemon(self):
        application, thread = self._run_application()
        self.assertTrue(application.await_bus_name())
        application.attach_kolibri(_RecordingKolibri())
        client_a = self._proxy()
        self._call(client_a, "Hold")

        self.updated_marker.touch()
        self._call(self._proxy(self._private_connection()), "Hold")
        self._call(client_a, "Release")
        thread.join(CALL_TIMEOUT_MS / 1000)
        self.assertFalse(thread.is_alive())

    def test_run_fails_when_bus_name_is_taken(self):
        self._own_bus_name_elsewhere()
        application = Application(_PendingSearchHandler())
        thread, exit_status = self._start_application(application)

        thread.join(CALL_TIMEOUT_MS / 1000)
        self.assertFalse(thread.is_alive())
        self.assertNotEqual(exit_status[0], 0)
        self.assertFalse(application.await_bus_name())


if __name__ == "__main__":
    unittest.main()
