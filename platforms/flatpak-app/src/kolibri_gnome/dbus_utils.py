from gi.repository import Gio
from gi.repository import GLib

from contextlib import contextmanager
from typing import NamedTuple


class DBusMethodContext(NamedTuple):
    connection: Gio.DBusConnection
    sender: str
    object_path: str
    interface_name: str
    method_name: str


class DBusMethodJob(object):
    def __init__(
        self, application, method_name, method, args, out_args, invocation, context
    ):
        self.__application = application
        self.__method_name = method_name
        self.__method = method
        self.__args = args
        self.__out_args = out_args
        self.__invocation = invocation
        self.__context = context

    @property
    def context(self):
        return self.__context

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
        with _gapplication_hold(self.__application):
            try:
                result = self.__method(*self.__args, self.context, cancellable=cancellable)
                self.__return_value(result)
            except Exception as error:
                self.__return_error(
                    Gio.io_error_quark(), Gio.IOErrorEnum.FAILED, str(error)
                )

    def run_async(self, job, cancellable, user_data):
        self.run(cancellable=cancellable)


class DBusServer(object):
    INTERFACE_XML = ""

    def __init__(self, application):
        self.__application = application
        self.__registration_ids = []
        self.__method_outargs = {}
        self.__method_jobs = dict()

    @property
    def application(self):
        return self.__application

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
        invocation
    ):
        args = list(parameters.unpack())
        out_args = self.__method_outargs[method_name]
        method = getattr(self, method_name)

        context = DBusMethodContext(
            connection, sender, object_path, interface_name, method_name
        )

        job = DBusMethodJob(
            self.application,
            method_name,
            method,
            args,
            out_args,
            invocation,
            context
        )

        cancellable = Gio.Cancellable()

        old_job = self.__method_jobs.pop(method_name, None)
        if old_job:
            old_job.cancel()
        self.__method_jobs[method_name] = cancellable

        Gio.io_scheduler_push_job(
            job.run_async, None, GLib.PRIORITY_DEFAULT, cancellable
        )


@contextmanager
def _gapplication_hold(application):
    application.hold()
    try:
        yield
    finally:
        application.release()

