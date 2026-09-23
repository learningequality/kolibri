import unittest

from gi.repository import Gio
from gi.repository import GLib
from gi.repository import KolibriDaemonDBus

from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_MAIN_OBJECT_PATH
from kolibri_gnome.kolibri_daemon_manager import KolibriDaemonManager


# Run under tests/dbus-session.conf, which has no .service files.
class TestKolibriDaemonManager(unittest.TestCase):
    def setUp(self):
        connection = Gio.bus_get_sync(Gio.BusType.SESSION)
        skeleton = KolibriDaemonDBus.MainSkeleton()
        skeleton.props.status = "STARTED"
        skeleton.connect("handle-hold", self._complete_hold)
        skeleton.export(connection, DAEMON_MAIN_OBJECT_PATH)
        self.addCleanup(skeleton.unexport)
        self.skeleton = skeleton
        self.owner_id = Gio.bus_own_name_on_connection(
            connection,
            DAEMON_APPLICATION_ID,
            Gio.BusNameOwnerFlags.NONE,
            None,
            None,
        )

    def _complete_hold(self, interface, invocation):
        interface.complete_hold(invocation)
        return True

    def _iterate_until(self, predicate):
        context = GLib.MainContext.default()
        deadline = GLib.get_monotonic_time() + 5 * GLib.USEC_PER_SEC
        while not predicate() and GLib.get_monotonic_time() < deadline:
            context.iteration(False)
        return predicate()

    def test_daemon_vanishing_marks_it_stopped(self):
        manager = KolibriDaemonManager()
        manager.init()
        self.assertTrue(self._iterate_until(lambda: manager.props.is_started))

        Gio.bus_unown_name(self.owner_id)

        self.assertTrue(self._iterate_until(lambda: manager.props.is_stopped))
        # The restart's Start() fails: the test bus has no .service file.
        self.assertTrue(self._iterate_until(lambda: manager.props.has_error))

    def test_unrelated_change_keeps_failed_start_error(self):
        manager = KolibriDaemonManager()
        manager.init()
        self.assertTrue(self._iterate_until(lambda: manager.props.is_started))

        # Unhandled, the restart's Start() replies with an error.
        self.skeleton.props.status = "STOPPED"
        self.assertTrue(self._iterate_until(lambda: manager.props.has_error))

        self.skeleton.props.app_key = "new-key"

        self.assertTrue(self._iterate_until(lambda: manager.props.app_key))
        self.assertTrue(manager.props.has_error)


if __name__ == "__main__":
    unittest.main()
