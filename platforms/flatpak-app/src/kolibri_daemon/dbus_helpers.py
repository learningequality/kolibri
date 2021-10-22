from __future__ import annotations

from gi.repository import Gio


class DBusManagerProxy(Gio.DBusProxy):
    def __init__(self, connection):
        super().__init__(
            g_connection=connection,
            g_name="org.freedesktop.DBus",
            g_object_path="/org/freedesktop/DBus",
            g_interface_name="org.freedesktop.DBus",
        )


def get_user_id_for_dbus_invocation(
    invocation: Gio.DBusMethodInvocation, **kwargs
) -> str:
    sender = invocation.get_sender()
    connection = invocation.get_connection()
    dbus_manager = DBusManagerProxy(connection)
    dbus_manager.init()
    user_id = dbus_manager.GetConnectionUnixUser("(s)", sender, **kwargs)
    if user_id:
        return int(user_id)
    else:
        return None
