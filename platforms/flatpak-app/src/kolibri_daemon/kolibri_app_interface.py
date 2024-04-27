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
        interface.register(check_is_metered=self.__app_interface_check_is_metered)

    def __app_interface_check_is_metered(self) -> bool:
        return Gio.NetworkMonitor.get_default().get_network_metered()
