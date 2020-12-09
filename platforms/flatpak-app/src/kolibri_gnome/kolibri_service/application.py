from gi.repository import Gio
from gi.repository import GLib

from .. import config
from .kolibri_service import KolibriServiceManager
from .utils import gapplication_hold


INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 # 5 minutes in milliseconds


class DbusMethodJob(object):
    def __init__(
        self, application, method_name, method, args, out_args, invocation, connection=None, sender=None
    ):
        self.__application = application
        self.__method_name = method_name
        self.__method = method
        self.__args = args
        self.__out_args = out_args
        self.__invocation = invocation
        self.__connection = connection
        self.__sender = sender

    @property
    def connection(self):
        return self.__connection

    @property
    def sender(self):
        return self.__sender

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
                result = self.__method(*self.__args, self, cancellable=cancellable)
                self.__return_value(result)
            except Exception as error:
                self.__return_error(
                    Gio.io_error_quark(), Gio.IOErrorEnum.FAILED, str(error)
                )

    def run_async(self, job, cancellable, user_data):
        self.run(cancellable=cancellable)


class KolibriDaemon(object):
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
        self.__application = application
        self.__kolibri_service_manager = kolibri_service_manager
        self.__hold_clients = dict()
        self.__registration_ids = []
        self.__method_outargs = {}
        self.__existing_jobs = dict()

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
            self.__application,
            method_name,
            method,
            args,
            out_args,
            invocation,
            connection=connection,
            sender=sender,
        )
        cancellable = Gio.Cancellable()
        if self.__existing_jobs.get(method_name):
            self.__existing_jobs[method_name].cancel()
        self.__existing_jobs[method_name] = cancellable
        Gio.io_scheduler_push_job(
            job.run_async, None, GLib.PRIORITY_DEFAULT, cancellable
        )

    def Hold(self, context, cancellable=None):
        self.__hold_for_client(context.connection, context.sender)

    def Release(self, context, cancellable=None):
        self.__release_for_client(context.sender)

    def GetStatus(self, context, cancellable=None):
        if self.__kolibri_service_manager.is_starting:
            return 'starting'
        elif self.__kolibri_service_manager.is_stopped:
            return 'stopped'
        elif self.__kolibri_service_manager.start_result is True:
            return 'started'
        elif self.__kolibri_service_manager.start_result is False:
            return 'error'
        else:
            return 'unknown'

        return 'invalid'

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

        self.__application.hold()

    def __release_for_client(self, name):
        if name not in self.__hold_clients.keys():
            return

        watch_id = self.__hold_clients.pop(name)
        Gio.bus_unwatch_name(watch_id)

        self.__application.release()

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
        self.__kolibri_daemon = None
        self.connect("startup", self.__on_startup)
        self.connect("activate", self.__on_activate)
        self.connect("shutdown", self.__on_shutdown)

    def do_dbus_register(self, dbus_connection, object_path):
        self.__kolibri_daemon = KolibriDaemon(self, self.__kolibri_service_manager)
        self.__kolibri_daemon.register_on_connection(dbus_connection, object_path)
        return True

    def do_dbus_unregister(self, dbus_connection, object_path):
        if self.__kolibri_daemon:
            self.__kolibri_daemon.unregister_on_connection(dbus_connection)
        return True

    def __on_startup(self, application):
        self.__kolibri_service_manager.start_kolibri()
        pass

    def __on_activate(self, application):
        pass

    def __on_shutdown(self, shutdown):
        self.__kolibri_service_manager.stop_kolibri()
