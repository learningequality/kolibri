import logging

logger = logging.getLogger(__name__)

import multiprocessing

from ctypes import c_bool, c_char, c_int
from enum import Enum

from .kolibri_service_main import KolibriServiceMainProcess
from .kolibri_service_monitor import KolibriServiceMonitorProcess
from .kolibri_service_setup import KolibriServiceSetupProcess
from .kolibri_service_stop import KolibriServiceStopProcess


class KolibriServiceContext(object):
    """
    Common context passed to KolibriService processes. This includes events
    and shared values to facilitate communication.
    """

    APP_KEY_LENGTH = 32
    BASE_URL_LENGTH = 128

    class SetupResult(Enum):
        NONE = 1
        SUCCESS = 2
        ERROR = 3

    class StartResult(Enum):
        NONE = 1
        SUCCESS = 2
        ERROR = 3

    def __init__(self):
        self.__is_starting_value = multiprocessing.Value(c_bool)
        self.__is_starting_set_event = multiprocessing.Event()

        self.__start_result_value = multiprocessing.Value(c_int)
        self.__start_result_set_event = multiprocessing.Event()

        self.__is_stopped_value = multiprocessing.Value(c_bool)
        self.__is_stopped_set_event = multiprocessing.Event()

        self.__setup_result_value = multiprocessing.Value(c_int)
        self.__setup_result_set_event = multiprocessing.Event()

        self.__is_responding_value = multiprocessing.Value(c_bool)
        self.__is_responding_set_event = multiprocessing.Event()

        self.__app_key_value = multiprocessing.Array(c_char, self.APP_KEY_LENGTH)
        self.__app_key_set_event = multiprocessing.Event()

        self.__base_url_value = multiprocessing.Array(c_char, self.BASE_URL_LENGTH)
        self.__base_url_set_event = multiprocessing.Event()

    @property
    def is_starting(self):
        if self.__is_starting_set_event.is_set():
            return self.__is_starting_value.value
        else:
            return None

    @is_starting.setter
    def is_starting(self, is_starting):
        if is_starting is None:
            self.__is_starting_set_event.clear()
            self.__is_starting_value.value = False
        else:
            self.__is_starting_value.value = bool(is_starting)
            self.__is_starting_set_event.set()

    def await_is_starting(self):
        self.__is_starting_set_event.wait()
        return self.is_starting

    @property
    def start_result(self):
        if self.__start_result_set_event.is_set():
            return self.StartResult(self.__start_result_value.value)
        else:
            return None

    @start_result.setter
    def start_result(self, start_result):
        if start_result is None:
            self.__start_result_set_event.clear()
            self.__start_result_value.value = 0
        else:
            self.__start_result_value.value = start_result.value
            self.__start_result_set_event.set()

    def await_start_result(self):
        self.__start_result_set_event.wait()
        return self.start_result

    @property
    def is_stopped(self):
        if self.__is_stopped_set_event.is_set():
            return self.__is_stopped_value.value
        else:
            return None

    @is_stopped.setter
    def is_stopped(self, is_stopped):
        self.__is_stopped_value.value = is_stopped
        if is_stopped is None:
            self.__is_stopped_set_event.clear()
        else:
            self.__is_stopped_set_event.set()

    def await_is_stopped(self):
        self.__is_stopped_set_event.wait()
        return self.is_stopped

    @property
    def setup_result(self):
        if self.__setup_result_set_event.is_set():
            return self.SetupResult(self.__setup_result_value.value)
        else:
            return None

    @setup_result.setter
    def setup_result(self, setup_result):
        if setup_result is None:
            self.__setup_result_set_event.clear()
            self.__setup_result_value.value = 0
        else:
            self.__setup_result_value.value = setup_result.value
            self.__setup_result_set_event.set()

    def await_setup_result(self):
        self.__setup_result_set_event.wait()
        return self.setup_result

    @property
    def is_responding(self):
        if self.__is_responding_set_event.is_set():
            return self.__is_responding_value.value
        else:
            return None

    @is_responding.setter
    def is_responding(self, is_responding):
        self.__is_responding_value.value = is_responding
        if is_responding is None:
            self.__is_responding_set_event.clear()
        else:
            self.__is_responding_set_event.set()

    def await_is_responding(self):
        self.__is_responding_set_event.wait()
        return self.is_responding

    @property
    def app_key(self):
        if self.__app_key_set_event.is_set():
            return self.__app_key_value.value.decode("ascii")
        else:
            return None

    @app_key.setter
    def app_key(self, app_key):
        self.__app_key_value.value = bytes(app_key, encoding="ascii")
        if app_key is None:
            self.__app_key_set_event.clear()
        else:
            self.__app_key_set_event.set()

    def await_app_key(self):
        self.__app_key_set_event.wait()
        return self.app_key

    @property
    def base_url(self):
        if self.__base_url_set_event.is_set():
            return self.__base_url_value.value.decode("ascii")
        else:
            return None

    @base_url.setter
    def base_url(self, base_url):
        self.__base_url_value.value = bytes(base_url, encoding="ascii")
        if base_url is None:
            self.__base_url_set_event.clear()
        else:
            self.__base_url_set_event.set()

    def await_base_url(self):
        self.__base_url_set_event.wait()
        return self.base_url


class KolibriServiceManager(KolibriServiceContext):
    """
    Manages the Kolibri service, starting and stopping it in separate
    processes, and checking for availability.
    """

    class Status(Enum):
        NONE = 1
        STARTING = 2
        STOPPED = 3
        STARTED = 4
        ERROR = 5

    def __init__(self):
        super().__init__()

        self.is_stopped = True

        self.__main_process = None
        self.__monitor_process = None
        self.__setup_process = None
        self.__stop_process = None

    def get_status(self):
        if self.is_starting:
            return self.Status.STARTING
        elif self.is_stopped:
            return self.Status.STOPPED
        elif self.start_result == self.StartResult.SUCCESS:
            return self.Status.STARTED
        elif self.start_result == self.StartResult.ERROR:
            return self.Status.ERROR
        else:
            return self.Status.NONE

    def get_kolibri_url(self, **kwargs):
        from urllib.parse import urljoin
        from urllib.parse import urlsplit
        from urllib.parse import urlunsplit

        base_url = self.await_base_url()

        base_url = urlsplit(base_url)
        if "path" in kwargs:
            kwargs["path"] = urljoin(base_url.path, kwargs["path"].lstrip("/"))
        target_url = base_url._replace(**kwargs)
        return urlunsplit(target_url)

    def join(self):
        if self.__main_process and self.__main_process.is_alive():
            self.__main_process.join()
        if self.__monitor_process and self.__monitor_process.is_alive():
            self.__monitor_process.join()
        if self.__setup_process and self.__setup_process.is_alive():
            self.__setup_process.join()
        if self.__stop_process and self.__stop_process.is_alive():
            self.__stop_process.join()

    def start_kolibri(self):
        if not self.__setup_process:
            self.__setup_process = KolibriServiceSetupProcess(self)
            self.__setup_process.start()

        if self.__main_process and self.__main_process.is_alive():
            return
        else:
            self.__main_process = KolibriServiceMainProcess(self)
            self.__main_process.start()

        if self.__monitor_process and self.__monitor_process.is_alive():
            return
        else:
            self.__monitor_process = KolibriServiceMonitorProcess(self)
            self.__monitor_process.start()

    def stop_kolibri(self):
        if self.__stop_process and self.__stop_process.is_alive():
            return
        else:
            self.__stop_process = KolibriServiceStopProcess(self)
            self.__stop_process.start()
