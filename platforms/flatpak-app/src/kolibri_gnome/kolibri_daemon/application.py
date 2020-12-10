from gi.repository import Gio
from gi.repository import GLib

from .. import config
from ..dbus_utils import DBusServer
from .kolibri_service import KolibriServiceManager


INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 # 5 minutes in milliseconds


class KolibriDaemon(DBusServer):
    INTERFACE_XML = """
    <!DOCTYPE node PUBLIC
     '-//freedesktop//DTD D-BUS Object Introspection 1.0//EN'
     'http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd'>
    <node>
      <interface name="org.learningequality.Kolibri.Daemon">
        <method name="Hold">
        </method>
        <method name="Release">
        </method>
        <method name="GetStatus">
          <arg name="status" direction="out" type="s" />
        </method>
        <method name="GetBaseURL">
          <arg name="base_url" direction="out" type="s" />
        </method>
        <method name="GetAppKey">
          <arg name="app_key" direction="out" type="s" />
        </method>
        <signal name="IsReady">
          <arg name="base_url" type="s" />
          <arg name="app_key" type="s" />
        </signal>
      </interface>
    </node>
    """

    def __init__(self, application, kolibri_service_manager):
        super().__init__(application)
        self.__kolibri_service_manager = kolibri_service_manager
        self.__hold_clients = dict()

    def Hold(self, context, cancellable=None):
        self.__hold_for_client(context.connection, context.sender)

    def Release(self, context, cancellable=None):
        self.__release_for_client(context.sender)

    def GetStatus(self, context, cancellable=None):
        status = self.__kolibri_service_manager.get_status()
        return status.name

    def GetBaseURL(self, context, cancellable=None):
        return self.__kolibri_service_manager.base_url or ''

    def GetAppKey(self, context, cancellable=None):
        return self.__kolibri_service_manager.app_key or ''

    def __hold_for_client(self, connection, name):
        if name in self.__hold_clients.keys():
            return

        watch_id = Gio.bus_watch_name_on_connection(
            connection,
            name,
            Gio.BusNameWatcherFlags.NONE,
            None,
            self.__on_hold_client_vanished,
        )
        self.__hold_clients[name] = watch_id

        self.application.hold()

    def __release_for_client(self, name):
        if name not in self.__hold_clients.keys():
            return

        watch_id = self.__hold_clients.pop(name)
        Gio.bus_unwatch_name(watch_id)

        self.application.release()

    def __on_hold_client_vanished(self, connection, name):
        self.__release_for_client(name)


class Application(Gio.Application):
    def __init__(self):
        super().__init__(
            application_id=config.DAEMON_APPLICATION_ID,
            flags=Gio.ApplicationFlags.IS_SERVICE,
            inactivity_timeout=INACTIVITY_TIMEOUT_MS,
        )
        self.__kolibri_service_manager = KolibriServiceManager()
        self.__kolibri_daemon = KolibriDaemon(self, self.__kolibri_service_manager)
        self.connect("startup", self.__on_startup)
        self.connect("activate", self.__on_activate)
        self.connect("shutdown", self.__on_shutdown)

    def do_dbus_register(self, dbus_connection, object_path):
        self.__kolibri_daemon.register_on_connection(dbus_connection, object_path)
        return True

    def do_dbus_unregister(self, dbus_connection, object_path):
        self.__kolibri_daemon.unregister_on_connection(dbus_connection)
        return True

    def __on_startup(self, application):
        self.__kolibri_service_manager.start_kolibri()

    def __on_activate(self, application):
        pass

    def __on_shutdown(self, shutdown):
        self.__kolibri_service_manager.stop_kolibri()
