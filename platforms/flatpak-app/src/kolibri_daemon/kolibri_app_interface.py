import typing

from gi.repository import Gio
from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_PRIVATE_OBJECT_PATH


class KolibriAppInterface(object):
    _instance = None

    def __init__(self):
        pass

    @classmethod
    def get_default(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def register(self):
        from kolibri.plugins.app.utils import interface

        interface.register(
            get_os_user=self.__app_interface_get_os_user,
            check_is_metered=self.__app_interface_check_is_metered,
        )

    def __app_interface_get_os_user(
        self, auth_token: str
    ) -> typing.Tuple[typing.Optional[str], bool]:
        user_details = self._get_user_details(auth_token)

        if not user_details:
            return None, False

        # The user details object also includes user_id and full_name, but at
        # the moment we have no way to communicate this to Kolibri.

        return (
            user_details.get("user_name", None),
            user_details.get("is_admin", False),
        )

    def __app_interface_check_is_metered(self) -> bool:
        return Gio.NetworkMonitor.get_default().get_network_metered()

    def _get_user_details(self, auth_token: str) -> typing.Optional[dict]:
        bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
        proxy = Gio.DBusProxy.new_sync(
            bus,
            0,
            None,
            DAEMON_APPLICATION_ID,
            DAEMON_PRIVATE_OBJECT_PATH,
            "org.learningequality.Kolibri.Daemon.Private",
            None,
        )

        try:
            details = proxy.CheckLoginToken("(s)", auth_token)
        except Exception:
            return None

        return details
