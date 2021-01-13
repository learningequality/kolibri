from gi.repository import Gio
from gi.repository import GLib

from .. import config
from ..dbus_utils import DBusServer, dict_to_vardict
from ..kolibri_daemon_proxy import KolibriDaemonProxy


class SearchProvider(DBusServer):
    INTERFACE_XML = """
    <!DOCTYPE node PUBLIC
     '-//freedesktop//DTD D-BUS Object Introspection 1.0//EN'
     'http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd'>
    <node>
      <interface name="org.gnome.Shell.SearchProvider2">
        <method name="GetInitialResultSet">
          <arg direction="in"  type="as" name="terms" />
          <arg direction="out" type="as" />
        </method>
        <method name="GetSubsearchResultSet">
          <arg direction="in"  type="as" name="previous_results" />
          <arg direction="in"  type="as" name="terms" />
          <arg direction="out" type="as" />
        </method>
        <method name="GetResultMetas">
          <arg direction="in"  type="as" name="identifiers" />
          <arg direction="out" type="aa{sv}" />
        </method>
        <method name="ActivateResult">
          <arg direction="in"  type="s" name="identifier" />
          <arg direction="in"  type="as" name="terms" />
          <arg direction="in"  type="u" name="timestamp" />
        </method>
        <method name="LaunchSearch">
          <arg direction="in"  type="as" name="terms" />
          <arg direction="in"  type="u" name="timestamp" />
        </method>
      </interface>
    </node>
    """

    def __init__(self, application):
        super().__init__(application)
        self.__kolibri_daemon = KolibriDaemonProxy()

    def init(self):
        self.__kolibri_daemon.init()
        self.__kolibri_daemon.hold()

    def unregister(self):
        self.__kolibri_daemon.release()
        super().unregister()

    def GetInitialResultSet(self, terms, context, cancellable=None):
        kolibri_search = " ".join(terms)
        if len(kolibri_search) < 3:
            return []
        else:
            return self.__kolibri_daemon.get_item_ids_for_search(kolibri_search)

    def GetSubsearchResultSet(self, previous_results, terms, context, cancellable=None):
        kolibri_search = " ".join(terms)
        if len(kolibri_search) < 3:
            return []
        else:
            return self.__kolibri_daemon.get_item_ids_for_search(kolibri_search)

    def GetResultMetas(self, item_ids, context, cancellable=None):
        return list(
            map(
                dict_to_vardict,
                self.__kolibri_daemon.get_metadata_for_item_ids(item_ids),
            )
        )

    def ActivateResult(self, item_id, terms, timestamp, context, cancellable=None):
        self.__activate_kolibri(item_id, terms)

    def LaunchSearch(self, terms, timestamp, context, cancellable=None):
        self.__activate_kolibri("", terms)

    def __activate_kolibri(self, item_id, terms):
        kolibri_search = " ".join(terms)
        kolibri_url = "kolibri:///{item_id}?searchTerm={search}".format(
            item_id=item_id, search=kolibri_search
        )
        app_info = Gio.DesktopAppInfo.new(config.FRONTEND_APPLICATION_ID + ".desktop")
        return app_info.launch_uris([kolibri_url], None)


class Application(Gio.Application):
    def __init__(self):
        super().__init__(
            application_id=config.SEARCH_PROVIDER_APPLICATION_ID,
            flags=Gio.ApplicationFlags.IS_SERVICE,
            inactivity_timeout=30000,
        )
        self.__search_provider = SearchProvider(self)

    def do_dbus_register(self, connection, object_path):
        self.__search_provider.init()
        self.__search_provider.register_on_connection(connection, object_path)
        return True

    def do_dbus_unregister(self, connection, object_path):
        if self.__search_provider:
            self.__search_provider.unregister()
        return True
