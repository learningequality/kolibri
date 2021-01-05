from gi.repository import Gio
from gi.repository import GLib

from typing import NamedTuple

from .. import config
from ..dbus_utils import DBusServer
from .kolibri_service import KolibriServiceManager


INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000  # 5 minutes in milliseconds


class KolibriDaemon(DBusServer):
    INTERFACE_XML = """
    <!DOCTYPE node PUBLIC
     '-//freedesktop//DTD D-BUS Object Introspection 1.0//EN'
     'http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd'>
    <node>
      <interface name="org.learningequality.Kolibri.Daemon">
        <method name="Hold" />
        <method name="Release" />
        <property name="Status" type="s" access="read" />
        <property name="BaseURL" type="s" access="read" />
        <property name="AppKey" type="s" access="read" />
        <property name="KolibriHome" type="s" access="read" />
      </interface>
    </node>
    """

    class Properties(NamedTuple):
        Status: str
        BaseURL: str
        AppKey: str
        KolibriHome: str

    def __init__(self, application, kolibri_service_manager):
        super().__init__(application)
        self.__kolibri_service_manager = kolibri_service_manager
        self.__hold_clients = dict()
        self.__cached_properties = None

    def register_on_connection(self, *args):
        super().register_on_connection(*args)
        self.__update_cached_properties()
        self.__kolibri_service_manager.watch_changes(self.__update_cached_properties)

    def __update_cached_properties(self):
        new_properties = KolibriDaemon.Properties(
            Status=self.__kolibri_service_manager.status.name or "",
            BaseURL=self.__kolibri_service_manager.base_url or "",
            AppKey=self.__kolibri_service_manager.app_key or "",
            KolibriHome=self.__kolibri_service_manager.kolibri_home or "",
        )

        if new_properties != self.__cached_properties:
            self.__cached_properties = new_properties
            self.notify_properties_changed(
                "org.learningequality.Kolibri.Daemon", new_properties._asdict()
            )

    def Hold(self, context, cancellable=None):
        self.__hold_for_client(context.connection, context.sender)

    def Release(self, context, cancellable=None):
        self.__release_for_client(context.sender)

    def GetStatus(self, context, cancellable=None):
        return self.__cached_properties.Status

    def GetBaseURL(self, context, cancellable=None):
        return self.__cached_properties.BaseURL

    def GetAppKey(self, context, cancellable=None):
        return self.__cached_properties.AppKey

    def GetKolibriHome(self, context, cancellable=None):
        return self.__cached_properties.KolibriHome

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
        self.__kolibri_daemon.unregister()
        return True

    def __on_startup(self, application):
        self.__kolibri_service_manager.start_kolibri()

    def __on_activate(self, application):
        pass

    def __on_shutdown(self, shutdown):
        self.__kolibri_service_manager.stop_kolibri()
