from contextlib import contextmanager
from functools import partial
from typing import NamedTuple

from gi.repository import Gio
from gi.repository import GLib

# TODO: This should not be here, but the state of dbus Python bindings is
#       problematic.


class DBusMethodInfo(NamedTuple):
    interface_name: str
    method_name: str
    method_outargs: str
    method_fn: callable

    def get_variant_for_result(self, result):
        if not isinstance(result, tuple):
            result = (result,)

        if self.method_outargs:
            return GLib.Variant(self.method_outargs, result)
        else:
            return None


class DBusSignalInfo(NamedTuple):
    interface_name: str
    signal_name: str
    signal_args: str

    def get_variant_for_args(self, args):
        if not isinstance(args, tuple):
            args = (args,)

        if self.signal_args:
            return GLib.Variant(self.signal_args, args)
        else:
            return None


class DBusPropertyInfo(NamedTuple):
    interface_name: str
    property_name: str
    property_type: str
    get_fn: callable

    def get_variant_for_value(self, value):
        if self.property_type:
            return GLib.Variant(self.property_type, value)
        elif value:
            raise ValueError("property_type is not set")
        else:
            return None


class DBusMethodCallContext(NamedTuple):
    connection: Gio.DBusConnection
    sender: str
    object_path: str
    info: DBusMethodInfo


class DBusGetPropertyContext(NamedTuple):
    connection: Gio.DBusConnection
    sender: str
    object_path: str
    info: DBusPropertyInfo


class DBusMethodCallJob(object):
    def __init__(self, application, method_info, args, invocation, context):
        self.__application = application
        self.__method_info = method_info
        self.__args = args
        self.__invocation = invocation
        self.__context = context

    @property
    def method_info(self):
        return self.__method_info

    @property
    def context(self):
        return self.__context

    def __return_value(self, result):
        self.__invocation.return_value(self.method_info.get_variant_for_result(result))

    def __return_error(self, domain, code, message):
        self.__invocation.return_error_literal(domain, code, message)

    def run(self, cancellable=None):
        with _gapplication_hold(self.__application):
            try:
                result = self.method_info.method_fn(
                    *self.__args, self.context, cancellable=cancellable
                )
                self.__return_value(result)
            except Exception as error:
                self.__return_error(
                    Gio.io_error_quark(), Gio.IOErrorEnum.FAILED, str(error)
                )

    def run_async(self, job, cancellable, user_data):
        self.run(cancellable=cancellable)


class DBusServerObject(NamedTuple):
    connection: Gio.DBusConnection
    object_path: str
    registration_id: str


class DBusServer(object):
    INTERFACE_XML = ""

    def __init__(self, application):
        self.__application = application
        self.__methods = dict()
        self.__properties = dict()
        self.__method_calls = dict()
        self.__interfaces = set()
        self.__registered_objects = set()

        node_info = Gio.DBusNodeInfo.new_for_xml(self.INTERFACE_XML)
        for interface in node_info.interfaces:
            self.__add_interface(interface)

    @property
    def application(self):
        return self.__application

    def __add_interface(self, interface):
        self.__interfaces.add(interface)

        for method in interface.methods:
            method_fname = self.__fname(interface.name, method.name)
            method_fn = getattr(self, method.name)
            self.__methods[method_fname] = DBusMethodInfo(
                interface_name=interface.name,
                method_name=method.name,
                method_outargs=self.__args_as_tuple(method.out_args),
                method_fn=method_fn,
            )

        for signal in interface.signals:
            signal_info = DBusSignalInfo(
                interface_name=interface.name,
                signal_name=signal.name,
                signal_args=self.__args_as_tuple(signal.out_args),
            )
            signal_fn = partial(self.__emit_signal, signal_info)
            setattr(self, signal.name, signal_fn)

        for property in interface.properties:
            property_fname = self.__fname(interface.name, property.name)
            property_type = property.signature
            get_fn = getattr(self, "Get" + property.name, None)
            self.__properties[property_fname] = DBusPropertyInfo(
                interface_name=interface.name,
                property_name=property.name,
                property_type=property_type,
                get_fn=get_fn,
            )

    def register_on_connection(self, connection, object_path):
        for interface in self.__interfaces:
            registration_id = connection.register_object(
                object_path=object_path,
                interface_info=interface,
                method_call_closure=self.__on_method_call,
                get_property_closure=self.__on_get_property,
                set_property_closure=None,
            )
            self.__registered_objects.add(
                DBusServerObject(connection, object_path, registration_id)
            )

    def unregister_on_connection(self, connection):
        for registered_object in self.__registered_objects:
            assert connection == registered_object.connection
            connection.unregister_object(registered_object.registration_id)

    def notify_properties_changed(self, interface_name, properties={}):
        changed_properties = {}
        invalidated_properties = []

        for property_name, property_value in properties.items():
            property_fname = self.__fname(interface_name, property_name)
            property_info = self.__properties[property_fname]
            changed_properties[property_name] = property_info.get_variant_for_value(
                property_value
            )

        self.PropertiesChanged(interface_name, changed_properties, [])

    def PropertiesChanged(self, *args):
        signal_info = DBusSignalInfo(
            "org.freedesktop.DBus.Properties", "PropertiesChanged", "(sa{sv}as)"
        )
        return self.__emit_signal(signal_info, *args)

    def __emit_signal(self, signal_info, *args, destination_bus_name=None):
        parameters = signal_info.get_variant_for_args(args)

        registered_objects = (
            registered_object
            for registered_object in self.__registered_objects
            if not registered_object.connection.is_closed()
        )

        for registered_object in registered_objects:
            try:
                registered_object.connection.emit_signal(
                    destination_bus_name,
                    registered_object.object_path,
                    signal_info.interface_name,
                    signal_info.signal_name,
                    parameters,
                )
            except GLib.Error:
                pass

    def __fname(self, interface_name, method_name):
        return ".".join((interface_name, method_name))

    def __args_as_tuple(self, out_args):
        if not out_args:
            return None
        out_args_types = [GLib.VariantType(arg.signature) for arg in out_args]
        return GLib.VariantType.new_tuple(out_args_types).dup_string()

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
        method_fname = self.__fname(interface_name, method_name)
        method_info = self.__methods[method_fname]

        args = list(parameters.unpack())

        context = DBusMethodCallContext(connection, sender, object_path, method_info)
        job = DBusMethodCallJob(
            self.application, method_info, args, invocation, context
        )
        cancellable = Gio.Cancellable()

        old_job = self.__method_calls.pop(method_name, None)
        if old_job:
            old_job.cancel()
        self.__method_calls[method_name] = cancellable

        # TODO: Instead, call job.run_async in a thread

        job.run(cancellable)

    def __on_get_property(
        self, connection, sender, object_path, interface_name, property_name
    ):
        property_fname = self.__fname(interface_name, property_name)
        property_info = self.__properties[property_fname]

        context = DBusGetPropertyContext(connection, sender, object_path, property_info)
        result = property_info.get_fn(context)
        return property_info.get_variant_for_value(result)


def dict_to_vardict(data):
    # For now, we assume the vardict consists only of string values, which is
    # a safe assumption for the GNOME Shell Search Provider API.
    return dict((key, GLib.Variant("s", value)) for key, value in data.items())


@contextmanager
def _gapplication_hold(application):
    application.hold()
    try:
        yield
    finally:
        application.release()
