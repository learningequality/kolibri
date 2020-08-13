import logging

logger = logging.getLogger(__name__)

import multiprocessing

from ctypes import c_bool, c_char

from .kolibri_service_main import KolibriServiceMainProcess
from .kolibri_service_monitor import KolibriServiceMonitorProcess
from .kolibri_service_setup import KolibriServiceSetupProcess
from .kolibri_service_stop import KolibriServiceStopProcess


class KolibriServiceContext(object):
    APP_KEY_LENGTH = 32

    def __init__(self):
        self.__is_setup_complete_event = multiprocessing.Event()
        self.__is_starting_event = multiprocessing.Event()
        self.__is_stopped_event = multiprocessing.Event()

        self.__app_key_array = multiprocessing.Array(c_char, self.APP_KEY_LENGTH)
        self.__app_key_set_event = multiprocessing.Event()

        self.__is_responding_value = multiprocessing.Value(c_bool)
        self.__is_responding_set_event = multiprocessing.Event()

    def get_is_setup_complete(self):
        return self.__is_setup_complete_event.is_set()

    def set_is_setup_complete(self, value):
        if value:
            self.__is_setup_complete_event.set()
        else:
            self.__is_setup_complete_event.clear()

    def await_is_setup_complete(self):
        self.__is_setup_complete_event.wait()
        return self.get_is_setup_complete()

    def get_is_starting(self):
        return self.__is_starting_event.is_set()

    def set_is_starting(self, value):
        if value:
            self.__is_starting_event.set()
        else:
            self.__is_starting_event.clear()

    def await_is_starting(self):
        self.__is_starting_event.wait()
        return self.get_is_starting()

    def get_is_stopped(self):
        return self.__is_stopped_event.is_set()

    def set_is_stopped(self, value):
        if value:
            self.__is_stopped_event.set()
        else:
            self.__is_stopped_event.clear()

    def await_is_stopped(self):
        self.__is_stopped_event.wait()
        return self.get_is_stopped()

    def get_app_key(self):
        if self.__app_key_set_event.is_set():
            return self.__app_key_array.value.decode("ascii")
        else:
            return None

    def set_app_key(self, app_key):
        self.__app_key_array.value = bytes(app_key, encoding="ascii")
        self.__app_key_set_event.set()

    def await_app_key(self):
        self.__app_key_set_event.wait()
        return self.get_app_key()

    def get_is_responding(self):
        if self.__is_responding_set_event.is_set():
            return self.__is_responding_value.value
        else:
            return None

    def set_is_responding(self, is_responding):
        self.__is_responding_value.value = is_responding
        self.__is_responding_set_event.set()

    def await_is_responding(self):
        self.__is_responding_set_event.wait()
        return self.get_is_responding()


class KolibriServiceManager(object):
    """
    Manages the Kolibri service, starting and stopping it in separate
    processes, and checking for availability.
    """

    APP_INITIALIZE_URL = "/app/api/initialize/{key}"

    def __init__(self):
        self.__context = KolibriServiceContext()
        self.__main_process = KolibriServiceMainProcess(self.__context)
        self.__monitor_process = KolibriServiceMonitorProcess(self.__context)
        self.__setup_process = KolibriServiceSetupProcess(self.__context)
        self.__stop_process = KolibriServiceStopProcess(self.__context)

    def get_initialize_url(self, next_url=None):
        from ..kolibri_globals import KOLIBRI_BASE_URL

        app_key = self.__context.await_app_key()
        url = self.APP_INITIALIZE_URL.format(key=app_key)
        if next_url:
            url += "?next={next_url}".format(next_url=next_url)
        return KOLIBRI_BASE_URL + url.lstrip("/")

    def get_kolibri_url(self, **kwargs):
        from urllib.parse import urljoin
        from urllib.parse import urlsplit
        from urllib.parse import urlunsplit
        from ..kolibri_globals import KOLIBRI_BASE_URL

        base_url = urlsplit(KOLIBRI_BASE_URL)
        if "path" in kwargs:
            kwargs["path"] = urljoin(base_url.path, kwargs["path"].lstrip("/"))
        target_url = base_url._replace(**kwargs)
        return urlunsplit(target_url)

    def is_kolibri_url(self, url):
        from ..kolibri_globals import KOLIBRI_BASE_URL

        return url and url.startswith(KOLIBRI_BASE_URL)

    def is_kolibri_loading(self):
        return self.__context.get_is_responding() is None

    def is_kolibri_responding(self):
        return self.__context.get_is_responding()

    def wait_for_kolibri(self):
        return self.__context.await_is_responding()

    def join(self):
        if self.__main_process.is_alive():
            self.__main_process.join()
        if self.__monitor_process.is_alive():
            self.__monitor_process.join()
        if self.__setup_process.is_alive():
            self.__setup_process.join()
        if self.__stop_process.is_alive():
            self.__stop_process.join()

    def start_kolibri(self):
        self.__setup_process.start()
        self.__main_process.start()
        self.__monitor_process.start()

    def stop_kolibri(self):
        self.__stop_process.start()
