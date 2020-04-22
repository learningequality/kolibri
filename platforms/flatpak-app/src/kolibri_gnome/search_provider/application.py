from collections import deque
from gi.repository import Gio, GLib

from ..globals import kolibri_api_get_json


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
        self.__nodes_cache = deque(maxlen=30)

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
        if out_args != '()':
            variant = GLib.Variant(out_args, result)
            invocation.return_value(variant)
        else:
            invocation.return_value(None)

        self.__application.release()

    def GetInitialResultSet(self, terms):
        return list(self.__iter_item_ids_for_terms_list(terms))

    def GetSubsearchResultSet(self, previous_results, terms):
        return list(self.__iter_item_ids_for_terms_list(terms))

    def GetResultMetas(self, item_ids):
        return list(self.__iter_nodes_for_item_ids(item_ids))

    def ActivateResult(self, item_id, terms, timestamp):
        self.__activate_kolibri(item_id, terms)

    def LaunchSearch(self, terms, timestamp):
        self.__activate_kolibri("", terms)

    def __activate_kolibri(self, item_id, terms):
        kolibri_launcher = Gio.Application(
            application_id="org.learningequality.Kolibri",
            flags=Gio.ApplicationFlags.IS_LAUNCHER
        )
        args = [item_id]
        # for term in terms:
        #     args.extend(('--term', term))
        return kolibri_launcher.run(args)


    def __iter_item_ids_for_terms_list(self, terms):
        for term in terms:
            yield from self.__iter_item_ids_for_term(term)

    def __iter_item_ids_for_term(self, term):
        response = kolibri_api_get_json(
            '/api/content/contentnode_search',
            {'search': term, 'max_results': 10},
            dict()
        )

        nodes_cache = dict(self.__nodes_cache)

        for node in response.get('results', []):
            if node.get('kind') == 'topic':
                item_id = 't/{}'.format(node.get('id'))
            else:
                item_id = 'c/{}'.format(node.get('id'))
            if item_id not in nodes_cache:
                self.__nodes_cache.append((item_id, node))
            yield item_id

    def __iter_nodes_for_item_ids(self, item_ids):
        nodes_cache = dict(self.__nodes_cache)

        item_nodes = (
            (item_id, nodes_cache.get(item_id)) for item_id in item_ids
            if item_id in nodes_cache
        )

        for item_id, node in item_nodes:
            node_icon = ICON_LOOKUP.get(node.get('kind'), "application-x-executable")
            yield {
                "id": GLib.Variant('s', item_id),
                "name": GLib.Variant('s', node.get('title')),
                "description": GLib.Variant('s', node.get('description')),
                "gicon": GLib.Variant('s', node_icon)
            }


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


