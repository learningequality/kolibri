from gi.repository import Gio
from gi.repository import GLib

from .. import config
from ..globals import IS_KOLIBRI_LOCAL
from .utils import gapplication_hold


ICON_LOOKUP = {
    "video": "video-x-generic",
    "exercise": "edit-paste",
    "document": "x-office-document",
    "topic": "folder",
    "audio": "audio-x-generic",
    "html5": "text-html",
    "slideshow": "image-x-generic",
}


class DbusMethodJob(object):
    def __init__(self, application, method_name, method, args, out_args, invocation):
        self.__application = application
        self.__method_name = method_name
        self.__method = method
        self.__args = args
        self.__out_args = out_args
        self.__invocation = invocation

    def __return_value(self, result):
        if not isinstance(result, tuple):
            result = (result,)

        if self.__out_args != "()":
            variant = GLib.Variant(self.__out_args, result)
            self.__invocation.return_value(variant)
        else:
            self.__invocation.return_value(None)

    def __return_error(self, domain, code, message):
        self.__invocation.return_error_literal(domain, code, message)

    def run(self, cancellable=None):
        with gapplication_hold(self.__application):
            try:
                result = self.__method(*self.__args, cancellable=cancellable)
                self.__return_value(result)
            except Exception as error:
                self.__return_error(
                    Gio.io_error_quark(), Gio.IOErrorEnum.FAILED, str(error)
                )

    def run_async(self, job, cancellable, user_data):
        self.run(cancellable=cancellable)


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

    class NoSearchHandlersError(Exception):
        pass

    def __init__(self, application, search_handlers=tuple()):
        self.__application = application
        self.__search_handlers = search_handlers
        self.__registration_ids = []
        self.__method_outargs = {}
        self.__existing_jobs = dict()

    def get_search_results(self, *args):
        for search_handler in self.__search_handlers:
            try:
                result = search_handler.get_search_results(*args)
            except search_handler.SearchHandlerFailed:
                pass
            else:
                return result
        raise self.NoSearchHandlersError("No search handlers available")

    def get_node_data(self, *args):
        for search_handler in self.__search_handlers:
            try:
                result = search_handler.get_node_data(*args)
            except search_handler.SearchHandlerFailed:
                pass
            else:
                return result
        raise self.NoSearchHandlersError("No search handlers available")

    def register_on_connection(self, connection, object_path):
        info = Gio.DBusNodeInfo.new_for_xml(self.INTERFACE_XML)
        for interface in info.interfaces:
            for method in interface.methods:
                self.__method_outargs[method.name] = "({})".format(
                    "".join([arg.signature for arg in method.out_args])
                )

            object_id = connection.register_object(
                object_path=object_path,
                interface_info=interface,
                method_call_closure=self.__on_method_call,
            )
            self.__registration_ids.append(object_id)

    def unregister_on_connection(self, connection):
        for registration_id in self.__registration_ids:
            connection.unregister_object(registration_id)

    def __on_method_call(
        self,
        connection,
        sender,
        object_path,
        interface_name,
        method_name,
        parameters,
        invocation,
    ):
        args = list(parameters.unpack())
        out_args = self.__method_outargs[method_name]
        method = getattr(self, method_name)

        job = DbusMethodJob(
            self.__application, method_name, method, args, out_args, invocation
        )
        cancellable = Gio.Cancellable()
        if self.__existing_jobs.get(method_name):
            self.__existing_jobs[method_name].cancel()
        self.__existing_jobs[method_name] = cancellable
        Gio.io_scheduler_push_job(
            job.run_async, None, GLib.PRIORITY_DEFAULT, cancellable
        )

    def GetInitialResultSet(self, terms, cancellable=None):
        return self.__get_item_ids_for_search(" ".join(terms))

    def GetSubsearchResultSet(self, previous_results, terms, cancellable=None):
        return self.__get_item_ids_for_search(" ".join(terms))

    def GetResultMetas(self, item_ids, cancellable=None):
        return self.__get_nodes_for_item_ids(item_ids)

    def ActivateResult(self, item_id, terms, timestamp, cancellable=None):
        self.__activate_kolibri(item_id, terms)

    def LaunchSearch(self, terms, timestamp, cancellable=None):
        self.__activate_kolibri("", terms)

    def __activate_kolibri(self, item_id, terms):
        kolibri_url = "kolibri:///{item_id}?searchTerm={term}".format(
            item_id=item_id, term=" ".join(terms)
        )
        app_info = Gio.DesktopAppInfo.new(config.APPLICATION_ID + ".desktop")
        return app_info.launch_uris([kolibri_url], None)

    def __get_item_ids_for_search(self, search):
        return list(self.__iter_item_ids_for_search(search))

    def __get_nodes_for_item_ids(self, item_ids):
        return list(self.__iter_nodes_for_item_ids(item_ids))

    def __iter_item_ids_for_search(self, search):
        if len(search) < 3:
            return

        for node_data in self.get_search_results(search):
            if node_data.get("kind") == "topic":
                item_id = "t/{}".format(node_data.get("id"))
            else:
                item_id = "c/{}".format(node_data.get("id"))
            yield item_id

    def __iter_nodes_for_item_ids(self, item_ids):
        for item_id in item_ids:
            _kind_code, node_id = item_id.split("/", 1)
            node_data = self.get_node_data(node_id)
            node_icon = ICON_LOOKUP.get(
                node_data.get("kind"), "application-x-executable"
            )
            yield {
                "id": GLib.Variant("s", item_id),
                "name": GLib.Variant("s", node_data.get("title")),
                "description": GLib.Variant("s", node_data.get("description")),
                "gicon": GLib.Variant("s", node_icon),
            }


class SearchHandler(object):
    class SearchHandlerFailed(Exception):
        pass

    def get_search_results(self, search):
        raise NotImplementedError()

    def get_node_data(self, node_id):
        raise NotImplementedError()


class LocalSearchHandler(SearchHandler):
    def __init__(self):
        self.__did_django_setup = False

    def get_search_results(self, search):
        self.__do_django_setup()

        from kolibri.core.content.api import ContentNodeSearchViewset
        from kolibri.dist.rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get("", {"search": search, "max_results": 10})
        search_view = ContentNodeSearchViewset.as_view({"get": "list"})
        response = search_view(request)
        return response.data.get("results", [])

    def get_node_data(self, node_id):
        self.__do_django_setup()

        from kolibri.core.content.api import ContentNodeViewset
        from kolibri.dist.rest_framework.test import APIRequestFactory

        request = APIRequestFactory().get("", {})
        node_view = ContentNodeViewset.as_view({"get": "retrieve"})
        response = node_view(request, pk=node_id)
        return response.data

    def __do_django_setup(self):
        if self.__did_django_setup:
            return

        from kolibri.dist import django

        django.setup()
        self.__did_django_setup = True


class Application(Gio.Application):
    def __init__(self):
        super().__init__(
            application_id=config.APPLICATION_ID + ".SearchProvider",
            flags=Gio.ApplicationFlags.IS_SERVICE,
            inactivity_timeout=30000,
        )
        self.__search_provider = None
        self.connect("activate", self.__on_activate)

    def do_dbus_register(self, dbus_connection, object_path):
        if IS_KOLIBRI_LOCAL:
            search_handlers = [LocalSearchHandler()]
        else:
            search_handlers = []
        self.__search_provider = SearchProvider(self, search_handlers)
        self.__search_provider.register_on_connection(dbus_connection, object_path)
        return True

    def do_dbus_unregister(self, dbus_connection, object_path):
        if self.__search_provider:
            self.__search_provider.unregister_on_connection(dbus_connection)
        return True

    def __on_activate(self, application):
        pass
