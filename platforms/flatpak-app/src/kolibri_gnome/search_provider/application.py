from gi.repository import Gio, GLib

from kolibri.dist import django
django.setup()

from kolibri.core.content.api import ContentNodeSearchViewset
from kolibri.core.content.models import ContentNode
from kolibri.dist.rest_framework.test import APIRequestFactory


ICON_LOOKUP = {
    "video": "video-x-generic",
    "exercise": "edit-paste",
    "document": "x-office-document",
    "topic": "folder",
    "audio": "audio-x-generic",
    "html5": "text-html",
    "slideshow": "image-x-generic",
}


class SearchProvider:
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
        self.__application = application
        self.__registered_ids = []
        self.__method_outargs = {}

        self.launcher = None
        # TODO: self.launcher should be org.learningequality.Kolibri (the desktop application)

    def register_on_connection(self, connection, object_path):
        info = Gio.DBusNodeInfo.new_for_xml(self.INTERFACE_XML)
        for interface in info.interfaces:
            for method in interface .methods:
                self.__method_outargs[method.name] = '({})'.format(
                    ''.join([arg.signature for arg in method.out_args])
                )

            object_id = connection.register_object(
                object_path=object_path,
                interface_info=interface,
                method_call_closure=self.__on_method_call
            )
            self.__registered_ids.append(object_id)

    def __on_method_call(self, connection, sender, object_path,
                         interface_name, method_name, parameters, invocation):
        args = list(parameters.unpack())
        result = getattr(self, method_name)(*args)
        if not isinstance(result, tuple):
            result = (result,)

        self.__application.hold()

        out_args = self.__method_outargs[method_name]
        print("CALLING METHOD", method_name)
        if out_args != '()':
            variant = GLib.Variant(out_args, result)
            invocation.return_value(variant)
        else:
            invocation.return_value(None)

        self.__application.release()

    def GetInitialResultSet(self, terms):
        return self.__get_search_result_ids(terms)

    def GetSubsearchResultSet(self, previous_results, terms):
        return self.__get_search_result_ids(terms)

    def GetResultMetas(self, item_ids):
        results = []
        for item_id in item_ids:
            node = ContentNode.objects.get(id=item_id.split("/")[-1])
            node_icon = ICON_LOOKUP.get(node.kind, "application-x-executable")
            results.append(
                {
                    "id": GLib.Variant('s', item_id),
                    "name": GLib.Variant('s', node.title),
                    "description": GLib.Variant('s', node.description),
                    "gicon": GLib.Variant('s', node_icon)
                }
            )
        return results

    def ActivateResult(self, item_id, terms, timestamp):
        self.__activate_kolibri(item_id, terms)

    def LaunchSearch(self, terms, timestamp):
        self.__activate_kolibri("", terms)

    def __activate_kolibri(self, uris, terms):
        kolibri_launcher = Gio.Application(
            application_id="org.learningequality.Kolibri",
            flags=Gio.ApplicationFlags.IS_LAUNCHER
        )
        kolibri_launcher.run()

    @staticmethod
    def __get_search_result_ids(terms):
        request = APIRequestFactory().get("", {"search": terms, "max_results": 10})
        search_view = ContentNodeSearchViewset.as_view({"get": "list"})
        response = search_view(request)
        return [
            ("t/" if result["kind"] == "topic" else "c/") + result["id"]
            for result in response.data["results"]
        ]


class Application(Gio.Application):
    def __init__(self):
        super().__init__(
            application_id="org.learningequality.Kolibri.SearchProvider",
            flags=Gio.ApplicationFlags.IS_SERVICE,
            inactivity_timeout=10000
        )
        self.__search_provider = None
        self.connect('activate', self.__on_activate)
        self.connect('startup', self.__on_startup)

    def __on_activate(self, application):
        pass

    def __on_startup(self, application):
        if self.get_is_remote():
            return

        dbus_connection = self.get_dbus_connection()
        dbus_object_path = self.get_dbus_object_path()

        if not dbus_connection or not dbus_object_path:
            return

        self.__search_provider = SearchProvider(self)
        self.__search_provider.register_on_connection(
            dbus_connection,
            dbus_object_path
        )


