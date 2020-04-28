from gi.repository import Gdk, Gio, GLib

from .. import config
from ..globals import IS_KOLIBRI_LOCAL, kolibri_api_get_json

if IS_KOLIBRI_LOCAL:
    from kolibri.dist import django
    django.setup()

    from kolibri.core.content.api import ContentNodeSearchViewset, ContentNodeViewset
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


class SearchProvider(object):
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
        return list(self.__iter_item_ids_for_search(' '.join(terms)))

    def GetSubsearchResultSet(self, previous_results, terms):
        return list(self.__iter_item_ids_for_search(' '.join(terms)))

    def GetResultMetas(self, item_ids):
        return list(self.__iter_nodes_for_item_ids(item_ids))

    def ActivateResult(self, item_id, terms, timestamp):
        self.__activate_kolibri(item_id, terms)

    def LaunchSearch(self, terms, timestamp):
        self.__activate_kolibri("", terms)

    def __activate_kolibri(self, item_id, terms):
        kolibri_url = 'kolibri:///{item_id}?searchTerm={term}'.format(
            item_id=item_id,
            term=' '.join(terms)
        )
        app_info = Gio.DesktopAppInfo.new(config.APP_ID + '.desktop')
        return app_info.launch_uris([kolibri_url], None)

    def __iter_item_ids_for_search(self, search):
        for node_data in self.get_search_results(search):
            if node_data.get('kind') == 'topic':
                item_id = 't/{}'.format(node_data.get('id'))
            else:
                item_id = 'c/{}'.format(node_data.get('id'))
            yield item_id

    def __iter_nodes_for_item_ids(self, item_ids):
        for item_id in item_ids:
            _kind_code, node_id = item_id.split('/', 1)
            node_data = self.get_node_data(node_id)
            node_icon = ICON_LOOKUP.get(node_data.get('kind'), "application-x-executable")
            yield {
                "id": GLib.Variant('s', item_id),
                "name": GLib.Variant('s', node_data.get('title')),
                "description": GLib.Variant('s', node_data.get('description')),
                "gicon": GLib.Variant('s', node_icon)
            }

    def get_search_results(self, search):
        raise NotImplementedError()

    def get_node_data(self, node_id):
        raise NotImplementedError()


class LocalSearchProvider(SearchProvider):
    def get_search_results(self, search):
        request = APIRequestFactory().get("", {"search": search, "max_results": 10})
        search_view = ContentNodeSearchViewset.as_view({"get": "list"})
        response = search_view(request)
        return response.data.get('results', [])

    def get_node_data(self, node_id):
        request = APIRequestFactory().get("", {})
        node_view = ContentNodeViewset.as_view({"get": "retrieve"})
        response = node_view(request, pk=node_id)
        return response.data


class RemoteSearchProvider(SearchProvider):
    def get_search_results(self, search):
        response = kolibri_api_get_json(
            '/api/content/contentnode_search',
            query={'search': search, 'max_results': 10},
            default=dict()
        )
        return response.get('results', [])

    def get_node_data(self, node_id):
        response = kolibri_api_get_json(
            '/api/content/contentnode/{}'.format(node_id),
            default=dict()
        )
        return response


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

        if IS_KOLIBRI_LOCAL:
            self.__search_provider = LocalSearchProvider(self)
        else:
            self.__search_provider = RemoteSearchProvider(self)

        self.__search_provider.register_on_connection(
            dbus_connection,
            dbus_object_path
        )


