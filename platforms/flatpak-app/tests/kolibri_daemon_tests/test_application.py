import threading
import unittest
from concurrent.futures import Future

from gi.repository import Gio
from gi.repository import GLib
from gi.repository import KolibriDaemonDBus

from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_MAIN_OBJECT_PATH
from kolibri_daemon.application import Application
from kolibri_daemon.kolibri_search_handler import SearchHandler

CALL_TIMEOUT_MS = 5000


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
    def _run_application(self, search_handler=None):
        application = Application(search_handler or _PendingSearchHandler())
        thread = threading.Thread(
            target=application.run, args=(["kolibri-daemon", "--session"],)
        )
        thread.start()
        self.addCleanup(thread.join)
        self.addCleanup(GLib.idle_add, application.quit)
        return application, thread

    def _proxy(self):
        proxy = KolibriDaemonDBus.MainProxy(
            g_bus_type=Gio.BusType.SESSION,
            g_flags=Gio.DBusProxyFlags.DO_NOT_AUTO_START,
            g_name=DAEMON_APPLICATION_ID,
            g_object_path=DAEMON_MAIN_OBJECT_PATH,
            g_interface_name=KolibriDaemonDBus.main_interface_info().name,
        )
        proxy.init(None)
        return proxy

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
        proxy.call_sync("Hold", None, Gio.DBusCallFlags.NONE, CALL_TIMEOUT_MS, None)
        self.assertEqual(proxy.props.status, "STOPPED")
        proxy.call_sync("Start", None, Gio.DBusCallFlags.NONE, CALL_TIMEOUT_MS, None)

    def test_start_before_kolibri_attaches_starts_it_on_attach(self):
        application, _thread = self._run_application()
        self.assertTrue(application.await_bus_name())
        proxy = self._proxy()

        proxy.call_sync("Start", None, Gio.DBusCallFlags.NONE, CALL_TIMEOUT_MS, None)
        kolibri = _RecordingKolibri()
        application.attach_kolibri(kolibri)
        self.assertEqual(kolibri.start_count, 1)

    def test_stop_before_kolibri_attaches_cancels_start(self):
        application, _thread = self._run_application()
        self.assertTrue(application.await_bus_name())
        proxy = self._proxy()

        proxy.call_sync("Start", None, Gio.DBusCallFlags.NONE, CALL_TIMEOUT_MS, None)
        proxy.call_sync("Stop", None, Gio.DBusCallFlags.NONE, CALL_TIMEOUT_MS, None)
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


if __name__ == "__main__":
    unittest.main()
