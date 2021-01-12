from gi.repository import Gio
from gi.repository import GLib

from typing import NamedTuple

from .. import config
from ..dbus_utils import DBusServer, dict_to_vardict
from ..globals import KOLIBRI_USE_SYSTEM_INSTANCE

from .kolibri_service import KolibriServiceManager
from .kolibri_search_handler import LocalSearchHandler


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
        <method name="Start" />
        <method name="GetItemIdsForSearch">
          <arg direction="in" type="s" name="search" />
          <arg direction="out" type="as" name="item_ids" />
        </method>
        <method name="GetMetadataForItemIds">
          <arg direction="in" type="as" name="item_ids" />
          <arg direction="out" type="aa{sv}" name="metadata" />
        </method>
        <property name="AppKey" type="s" access="read" />
        <property name="BaseURL" type="s" access="read" />
        <property name="KolibriHome" type="s" access="read" />
        <property name="Status" type="s" access="read" />
        <property name="Version" type="u" access="read" />
      </interface>
    </node>
    """

    VERSION = 1

    class Properties(NamedTuple):
        AppKey: str
        BaseURL: str
        KolibriHome: str
        Status: str
        Version: int

    def __init__(self, application, service_manager, search_handler):
        super().__init__(application)
        self.__service_manager = service_manager
        self.__search_handler = search_handler
        self.__hold_clients = dict()
        self.__cached_properties = None

    def register_on_connection(self, *args):
        super().register_on_connection(*args)
        self.__update_cached_properties()
        self.__service_manager.watch_changes(self.__update_cached_properties)

    def __update_cached_properties(self):
        new_properties = KolibriDaemon.Properties(
            AppKey=self.__service_manager.app_key or "",
            BaseURL=self.__service_manager.base_url or "",
            KolibriHome=self.__service_manager.kolibri_home or "",
            Status=self.__service_manager.status.name or "",
            Version=self.VERSION,
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

    def Start(self, context, cancellable=None):
        self.__service_manager.start_kolibri()

    def GetItemIdsForSearch(self, search, context, cancellable=None):
        return self.__search_handler.get_item_ids_for_search(search)

    def GetMetadataForItemIds(self, item_ids, context, cancellable=None):
        return list(
            map(
                dict_to_vardict,
                self.__search_handler.get_metadata_for_item_ids(item_ids),
            )
        )

    def GetAppKey(self, context, cancellable=None):
        return self.__cached_properties.AppKey

    def GetBaseURL(self, context, cancellable=None):
        return self.__cached_properties.BaseURL

    def GetKolibriHome(self, context, cancellable=None):
        return self.__cached_properties.KolibriHome

    def GetStatus(self, context, cancellable=None):
        return self.__cached_properties.Status

    def GetVersion(self, context, cancellable=None):
        return self.__cached_properties.Version

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
        self.__service_manager = KolibriServiceManager()
        self.__kolibri_search_handler = LocalSearchHandler()
        self.__session_kolibri_daemon = None
        self.__system_kolibri_daemon = None
        self.connect("startup", self.__on_startup)
        self.connect("activate", self.__on_activate)
        self.connect("shutdown", self.__on_shutdown)

    def do_dbus_register(self, connection, object_path):
        if not KOLIBRI_USE_SYSTEM_INSTANCE:
            self.__session_kolibri_daemon = self.__create_kolibri_daemon()
            self.__session_kolibri_daemon.register_on_connection(
                connection, object_path
            )
        return True

    def do_dbus_unregister(self, connection, object_path):
        if self.__session_kolibri_daemon:
            self.__session_kolibri_daemon.unregister()
            self.__session_kolibri_daemon = None
        return True

    def __on_startup(self, application):
        if KOLIBRI_USE_SYSTEM_INSTANCE:
            Gio.bus_own_name(
                Gio.BusType.SYSTEM,
                config.DAEMON_APPLICATION_ID,
                Gio.BusNameOwnerFlags.NONE,
                None,
                self.__on_system_name_acquired,
                self.__on_system_name_lost,
            )

    def __on_system_name_acquired(self, connection, name):
        print("__on_system_name_acquired", name)
        if KOLIBRI_USE_SYSTEM_INSTANCE:
            object_path = "/org/learningequality/Kolibri/Devel/Daemon"
            self.__system_kolibri_daemon = self.__create_kolibri_daemon()
            self.__system_kolibri_daemon.register_on_connection(connection, object_path)

    def __on_system_name_lost(self, connection, name):
        print("__on_system_name_lost", name)
        if self.__system_kolibri_daemon:
            self.__system_kolibri_daemon.unregister()
            self.__system_kolibri_daemon = None

    def __on_activate(self, application):
        pass

    def __on_shutdown(self, shutdown):
        self.__service_manager.stop_kolibri()

    def __create_kolibri_daemon(self):
        return KolibriDaemon(
            self, self.__service_manager, self.__kolibri_search_handler
        )
