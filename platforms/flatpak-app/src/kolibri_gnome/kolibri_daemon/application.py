from typing import NamedTuple

from gi.repository import Gio
from gi.repository import GLib

from .. import config
from ..dbus_utils import DBusServer
from ..dbus_utils import dict_to_vardict
from .kolibri_search_handler import LocalSearchHandler
from .kolibri_service import KolibriServiceManager


INACTIVITY_TIMEOUT_MS = 30 * 1000  # 30 seconds in milliseconds

DEFAULT_STOP_KOLIBRI_TIMEOUT_SECONDS = 60  # 1 minute in seconds


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
        <method name="Stop" />
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
        self.__watch_changes_timeout_source = None

    def register_on_connection(self, *args):
        super().register_on_connection(*args)
        self.__update_cached_properties()
        self.__begin_watch_changes_timeout()

    def unregister_on_connection(self, *args):
        self.__cancel_watch_changes_timeout()
        super().unregister_on_connection(*args)

    @property
    def clients_count(self):
        return len(self.__hold_clients)

    def Hold(self, context, cancellable=None):
        self.__hold_for_client(context.connection, context.sender)

    def Release(self, context, cancellable=None):
        self.__release_for_client(context.sender)

    def Start(self, context, cancellable=None):
        self.__service_manager.start_kolibri()

    def Stop(self, context, cancellable=None):
        self.__service_manager.stop_kolibri()

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

    def __release_for_client(self, name):
        if name not in self.__hold_clients.keys():
            return

        watch_id = self.__hold_clients.pop(name)
        Gio.bus_unwatch_name(watch_id)

    def __on_hold_client_vanished(self, connection, name):
        self.__release_for_client(name)

    def __begin_watch_changes_timeout(self):
        if self.__watch_changes_timeout_source:
            return
        self.__watch_changes_timeout_source = GLib.timeout_add_seconds(
            1, self.__watch_changes_timeout_cb
        )

    def __cancel_watch_changes_timeout(self):
        if self.__watch_changes_timeout_source:
            GLib.source_remove(self.__watch_changes_timeout_source)
            self.__watch_changes_timeout_source = None

    def __watch_changes_timeout_cb(self):
        if self.__service_manager.pop_has_changes():
            self.__update_cached_properties()
        return GLib.SOURCE_CONTINUE

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


class Application(Gio.Application):
    def __init__(self, *args, **kwargs):
        super().__init__(
            *args,
            application_id=config.DAEMON_APPLICATION_ID,
            flags=(
                Gio.ApplicationFlags.IS_SERVICE | Gio.ApplicationFlags.ALLOW_REPLACEMENT
            ),
            inactivity_timeout=INACTIVITY_TIMEOUT_MS,
            **kwargs
        )

        self.__use_session_bus = None
        self.__use_system_bus = None

        self.add_main_option(
            "session",
            0,
            GLib.OptionFlags.NONE,
            GLib.OptionArg.NONE,
            "Connect to the session bus",
            None,
        )

        self.add_main_option(
            "system",
            0,
            GLib.OptionFlags.NONE,
            GLib.OptionArg.NONE,
            "Connect to the system bus",
            None,
        )

        self.add_main_option(
            "stop-timeout",
            0,
            GLib.OptionFlags.NONE,
            GLib.OptionArg.INT,
            "Timeout in seconds before stopping Kolibri",
            None,
        )

        self.__service_manager = KolibriServiceManager()
        self.__service_manager.init()
        self.__kolibri_search_handler = LocalSearchHandler()
        self.__kolibri_search_handler.init()

        self.__session_kolibri_daemon = None
        self.__system_kolibri_daemon = None
        self.__system_name_id = 0

        self.__has_hold_for_kolibri_service = False
        self.__auto_stop_timeout_source = None
        self.__stop_kolibri_timeout_source = None
        self.__stop_kolibri_timeout_interval = DEFAULT_STOP_KOLIBRI_TIMEOUT_SECONDS

    @property
    def use_session_bus(self):
        return self.__use_session_bus

    @property
    def use_system_bus(self):
        return self.__use_system_bus

    @property
    def clients_count(self):
        count = 0
        if self.__session_kolibri_daemon:
            count += self.__session_kolibri_daemon.clients_count
        if self.__system_kolibri_daemon:
            count += self.__system_kolibri_daemon.clients_count
        return count

    def do_dbus_register(self, connection, object_path):
        if self.use_session_bus:
            self.__session_kolibri_daemon = self.__create_kolibri_daemon()
            self.__session_kolibri_daemon.register_on_connection(
                connection, config.DAEMON_OBJECT_PATH
            )
        return True

    def do_dbus_unregister(self, connection, object_path):
        if self.__session_kolibri_daemon:
            self.__session_kolibri_daemon.unregister_on_connection(connection)
            self.__session_kolibri_daemon = None
        return True

    def do_name_lost(self):
        self.quit()

    def do_handle_local_options(self, options):
        use_system_bus = options.lookup_value("system", None)
        if use_system_bus is not None:
            self.__use_system_bus = use_system_bus.get_boolean()
        else:
            self.__use_system_bus = False

        use_session_bus = options.lookup_value("session", None)
        if use_session_bus is not None:
            self.__use_session_bus = use_session_bus.get_boolean()
        elif self.__use_system_bus:
            # The --session and --system options are mutually exclusive
            self.__use_session_bus = False
        else:
            self.__use_session_bus = True

        stop_timeout = options.lookup_value("stop-timeout", GLib.VariantType("i"))
        if stop_timeout is None:
            self.__stop_kolibri_timeout_interval = DEFAULT_STOP_KOLIBRI_TIMEOUT_SECONDS
        else:
            self.__stop_kolibri_timeout_interval = stop_timeout.get_int32()

        return -1

    def do_startup(self):
        if self.use_system_bus:
            Gio.bus_get(Gio.BusType.SYSTEM, None, self.__system_bus_on_get)
        self.__begin_auto_stop_timeout()
        Gio.Application.do_startup(self)

    def do_shutdown(self):
        if self.__system_name_id:
            Gio.bus_unown_name(self.__system_name_id)
            self.__system_name_id = 0

        self.__cancel_auto_stop_timeout()
        self.__kolibri_search_handler.stop()
        self.__service_manager.stop_kolibri()
        self.__service_manager.join()
        Gio.Application.do_shutdown(self)

    def __system_bus_on_get(self, source, result):
        connection = Gio.bus_get_finish(result)
        self.__system_kolibri_daemon = self.__create_kolibri_daemon()
        self.__system_kolibri_daemon.register_on_connection(
            connection, config.DAEMON_OBJECT_PATH
        )
        self.__system_name_id = Gio.bus_own_name_on_connection(
            connection,
            config.DAEMON_APPLICATION_ID,
            Gio.BusNameOwnerFlags.NONE,
            self.__on_system_name_acquired,
            self.__on_system_name_lost,
        )

    def __on_system_name_acquired(self, connection, name):
        pass

    def __on_system_name_lost(self, connection, name):
        if self.__system_kolibri_daemon:
            self.__system_kolibri_daemon.unregister_on_connection(connection)
            self.__system_kolibri_daemon = None

    def __create_kolibri_daemon(self):
        return KolibriDaemon(
            self, self.__service_manager, self.__kolibri_search_handler
        )

    def __hold_for_kolibri_service(self):
        if not self.__has_hold_for_kolibri_service:
            self.__has_hold_for_kolibri_service = True
            self.hold()

    def __release_for_kolibri_service(self):
        if self.__has_hold_for_kolibri_service:
            self.__has_hold_for_kolibri_service = False
            self.release()

    def __begin_auto_stop_timeout(self):
        if self.__auto_stop_timeout_source:
            return
        self.__auto_stop_timeout_source = GLib.timeout_add_seconds(
            5, self.__auto_stop_timeout_cb
        )

    def __cancel_auto_stop_timeout(self):
        if self.__auto_stop_timeout_source:
            GLib.source_remove(self.__auto_stop_timeout_source)
            self.__auto_stop_timeout_source = None

    def __auto_stop_timeout_cb(self):
        # We manage Kolibri separately from GApplication's built in lifecycle
        # code. This allows us to stop the Kolibri service while providing the
        # KolibriDaemon dbus interface, instead of stopping Kolibri after the
        # dbus connection has been closed.

        self.__service_manager.cleanup()

        # Stop Kolibri if no clients are connected
        if self.clients_count == 0 and self.__service_manager.is_running():
            self.__begin_stop_kolibri_timeout()
        else:
            self.__cancel_stop_kolibri_timeout()

        # Add a GApplication hold if clients are connected or Kolibri is running
        if self.clients_count > 0 or self.__service_manager.is_running():
            self.__hold_for_kolibri_service()
        else:
            self.__release_for_kolibri_service()

        return GLib.SOURCE_CONTINUE

    def __begin_stop_kolibri_timeout(self):
        if self.__stop_kolibri_timeout_source:
            return
        self.__stop_kolibri_timeout_source = GLib.timeout_add_seconds(
            self.__stop_kolibri_timeout_interval, self.__stop_kolibri_timeout_cb
        )

    def __cancel_stop_kolibri_timeout(self):
        if self.__stop_kolibri_timeout_source:
            GLib.source_remove(self.__stop_kolibri_timeout_source)
            self.__stop_kolibri_timeout_source = None

    def __stop_kolibri_timeout_cb(self):
        if self.clients_count == 0:
            self.__service_manager.stop_kolibri()
        self.__stop_kolibri_timeout_source = None
        return GLib.SOURCE_REMOVE
