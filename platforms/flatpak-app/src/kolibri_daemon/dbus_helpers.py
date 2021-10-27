from __future__ import annotations

from concurrent.futures import Future

from gi.repository import Gio
from gi.repository import GLib

from .utils import AsyncResultFuture


class DBusManagerProxy(Gio.DBusProxy):
    @classmethod
    def get_default(cls, connection: Gio.DBusConnection):
        return cls(
            g_connection=connection,
            g_name="org.freedesktop.DBus",
            g_object_path="/org/freedesktop/DBus",
            g_interface_name="org.freedesktop.DBus",
        )

    def init_future(self) -> Future[DBusManagerProxy]:
        future = AsyncResultFuture(return_source=True)
        self.init_async(GLib.PRIORITY_DEFAULT, None, future.async_result_handler)
        return future

    def get_user_id_from_dbus_invocation_future(
        self, invocation: Gio.DBusMethodInvocation
    ) -> Future[int]:
        future = AsyncResultFuture()
        self.GetConnectionUnixUser(
            "(s)", invocation.get_sender(), result_handler=future.async_result_handler
        )
        return future
