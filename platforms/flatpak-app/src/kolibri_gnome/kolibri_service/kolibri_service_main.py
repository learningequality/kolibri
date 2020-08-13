import logging

logger = logging.getLogger(__name__)

import os
import multiprocessing
import io
import time

from ctypes import c_char
from contextlib import contextmanager

from .content_extensions import ContentExtensionsList


class KolibriServiceMainProcess(multiprocessing.Process):
    APP_KEY_LENGTH = 32

    def __init__(self, ready_event, retry_timeout_secs=None):
        self.__ready_event = ready_event
        self.__retry_timeout_secs = retry_timeout_secs
        self.__stopped_event = multiprocessing.Event()
        self.__keep_alive_event = multiprocessing.Event()
        self.__initialized_event = multiprocessing.Event()
        self.__app_key_array = multiprocessing.Array(c_char, self.APP_KEY_LENGTH)
        self.__active_extensions = ContentExtensionsList.from_flatpak_info()
        super().__init__()

    @property
    def stopped_event(self):
        return self.__stopped_event

    @property
    def keep_alive_event(self):
        return self.__keep_alive_event

    @property
    def initialized_event(self):
        return self.__initialized_event

    def get_app_key_sync(self):
        self.__initialized_event.wait()
        return self.__app_key_array.value.decode("ascii")

    def stop(self):
        self.__keep_alive_event.clear()

    def run(self):
        self.__keep_alive_event.set()

        with _set_event_on_exit(self.__stopped_event):
            self.__run()

    def __run(self):
        self.__ready_event.wait()

        self.__active_extensions.update_kolibri_environ(os.environ)

        while self.__keep_alive_event.is_set():
            return self.__run_kolibri_start()

    def __run_kolibri_start(self):
        from kolibri.plugins.registry import registered_plugins
        from kolibri.utils.cli import initialize, setup_logging, start

        registered_plugins.register_plugins(["kolibri.plugins.app"])

        setup_logging(debug=False)
        initialize()

        from kolibri.core.device.models import DeviceAppKey

        app_key_bytes = bytes(DeviceAppKey.get_app_key(), encoding="ascii")
        self.__app_key_array.value = app_key_bytes

        self.__initialized_event.set()

        try:
            from ..kolibri_globals import KOLIBRI_HTTP_PORT

            # TODO: Start on port 0 and get randomized port number from
            #       Kolibri. This requires some changes in Kolibri itself.
            #       After doing this, we should be able to remove some weird
            #       dependencies with Kolibri in the globals module.
            start.callback(KOLIBRI_HTTP_PORT, background=False)
        except SystemExit:
            # Kolibri sometimes calls sys.exit, but we don't want to exit
            pass


@contextmanager
def _set_event_on_exit(event):
    event.clear()
    yield event
    event.set()
