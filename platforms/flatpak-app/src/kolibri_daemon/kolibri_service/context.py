from __future__ import annotations

import multiprocessing
import typing
from ctypes import c_bool
from ctypes import c_char
from ctypes import c_int
from enum import auto
from enum import Enum


class KolibriServiceContext(object):
    """
    Common context passed to KolibriService processes. This includes events
    and shared values to facilitate communication.
    """

    APP_KEY_LENGTH: int = 32
    BASE_URL_LENGTH: int = 1024
    KOLIBRI_HOME_LENGTH: int = 4096

    __changed_event: multiprocessing.Event = None

    __is_starting_value: multiprocessing.Value = None
    __is_starting_set_event: multiprocessing.Event = None

    __is_started_value: multiprocessing.Value = None
    __is_started_set_event: multiprocessing.Event = None

    __start_result_value: multiprocessing.Value = None
    __start_result_set_event: multiprocessing.Event = None

    __is_stopped_value: multiprocessing.Value = None
    __is_stopped_set_event: multiprocessing.Event = None

    __setup_result_value: multiprocessing.Value = None
    __setup_result_set_event: multiprocessing.Event = None

    __app_key_value: multiprocessing.Array = None
    __app_key_set_event: multiprocessing.Event = None

    __base_url_value: multiprocessing.Array = None
    __base_url_set_event: multiprocessing.Event = None

    __kolibri_home_value: multiprocessing.Array = None
    __kolibri_home_set_event: multiprocessing.Event = None

    class SetupResult(Enum):
        NONE = auto()
        SUCCESS = auto()
        ERROR = auto()

    class StartResult(Enum):
        NONE = auto()
        SUCCESS = auto()
        ERROR = auto()

    def __init__(self):
        self.__changed_event = multiprocessing.Event()

        self.__is_starting_value = multiprocessing.Value(c_bool)
        self.__is_starting_set_event = multiprocessing.Event()

        self.__is_started_value = multiprocessing.Value(c_bool)
        self.__is_started_set_event = multiprocessing.Event()

        self.__start_result_value = multiprocessing.Value(c_int)
        self.__start_result_set_event = multiprocessing.Event()

        self.__is_stopped_value = multiprocessing.Value(c_bool)
        self.__is_stopped_set_event = multiprocessing.Event()

        self.__setup_result_value = multiprocessing.Value(c_int)
        self.__setup_result_set_event = multiprocessing.Event()

        self.__app_key_value = multiprocessing.Array(c_char, self.APP_KEY_LENGTH)
        self.__app_key_set_event = multiprocessing.Event()

        self.__base_url_value = multiprocessing.Array(c_char, self.BASE_URL_LENGTH)
        self.__base_url_set_event = multiprocessing.Event()

        self.__kolibri_home_value = multiprocessing.Array(
            c_char, self.KOLIBRI_HOME_LENGTH
        )
        self.__kolibri_home_set_event = multiprocessing.Event()

        self.is_stopped = True

    def push_has_changes(self):
        self.__changed_event.set()

    def pop_has_changes(self) -> bool:
        # TODO: It would be better to use a multiprocessing.Condition and wait()
        #       on it, but this does not play nicely with GLib's main loop.
        if self.__changed_event.is_set():
            self.__changed_event.clear()
            return True
        else:
            return False

    @property
    def is_starting(self) -> bool:
        if self.__is_starting_set_event.is_set():
            return self.__is_starting_value.value
        else:
            return None

    @is_starting.setter
    def is_starting(self, is_starting: bool):
        if is_starting is None:
            self.__is_starting_set_event.clear()
            self.__is_starting_value.value = False
        else:
            self.__is_starting_value.value = bool(is_starting)
            self.__is_starting_set_event.set()
        self.push_has_changes()

    def await_is_starting(self) -> bool:
        self.__is_starting_set_event.wait()
        return self.is_starting

    @property
    def is_started(self) -> bool:
        if self.__is_started_set_event.is_set():
            return self.__is_started_value.value
        else:
            return None

    @is_started.setter
    def is_started(self, is_started: bool):
        if is_started is None:
            self.__is_started_set_event.clear()
            self.__is_started_value.value = False
        else:
            self.__is_started_value.value = bool(is_started)
            self.__is_started_set_event.set()
        self.push_has_changes()

    def await_is_started(self) -> bool:
        self.__is_started_set_event.wait()
        return self.is_started

    @property
    def start_result(self) -> KolibriServiceContext.StartResult:
        if self.__start_result_set_event.is_set():
            return self.StartResult(self.__start_result_value.value)
        else:
            return None

    @start_result.setter
    def start_result(self, start_result: KolibriServiceContext.StartResult):
        if start_result is None:
            self.__start_result_set_event.clear()
            self.__start_result_value.value = 0
        else:
            self.__start_result_value.value = start_result.value
            self.__start_result_set_event.set()
        self.push_has_changes()

    def await_start_result(self) -> KolibriServiceContext.StartResult:
        self.__start_result_set_event.wait()
        return self.start_result

    @property
    def is_stopped(self) -> bool:
        if self.__is_stopped_set_event.is_set():
            return self.__is_stopped_value.value
        else:
            return None

    @is_stopped.setter
    def is_stopped(self, is_stopped: bool):
        self.__is_stopped_value.value = is_stopped
        if is_stopped is None:
            self.__is_stopped_set_event.clear()
        else:
            self.__is_stopped_set_event.set()
        self.push_has_changes()

    def await_is_stopped(self) -> bool:
        self.__is_stopped_set_event.wait()
        return self.is_stopped

    @property
    def setup_result(self) -> KolibriServiceContext.SetupResult:
        if self.__setup_result_set_event.is_set():
            return self.SetupResult(self.__setup_result_value.value)
        else:
            return None

    @setup_result.setter
    def setup_result(self, setup_result: KolibriServiceContext.SetupResult):
        if setup_result is None:
            self.__setup_result_set_event.clear()
            self.__setup_result_value.value = 0
        else:
            self.__setup_result_value.value = setup_result.value
            self.__setup_result_set_event.set()
        self.push_has_changes()

    def await_setup_result(self) -> KolibriServiceContext.SetupResult:
        self.__setup_result_set_event.wait()
        return self.setup_result

    @property
    def app_key(self) -> str:
        if self.__app_key_set_event.is_set():
            return self.__app_key_value.value.decode("ascii")
        else:
            return None

    @app_key.setter
    def app_key(self, app_key: str):
        self.__app_key_value.value = bytes(app_key, encoding="ascii")
        if app_key is None:
            self.__app_key_set_event.clear()
        else:
            self.__app_key_set_event.set()
        self.push_has_changes()

    def await_app_key(self) -> str:
        self.__app_key_set_event.wait()
        return self.app_key

    @property
    def base_url(self) -> str:
        if self.__base_url_set_event.is_set():
            return self.__base_url_value.value.decode("ascii")
        else:
            return None

    @base_url.setter
    def base_url(self, base_url: str):
        self.__base_url_value.value = bytes(base_url, encoding="ascii")
        if base_url is None:
            self.__base_url_set_event.clear()
        else:
            self.__base_url_set_event.set()
        self.push_has_changes()

    def await_base_url(self) -> str:
        self.__base_url_set_event.wait()
        return self.base_url

    @property
    def kolibri_home(self) -> str:
        if self.__kolibri_home_set_event.is_set():
            return self.__kolibri_home_value.value.decode("ascii")
        else:
            return None

    @kolibri_home.setter
    def kolibri_home(self, kolibri_home: str):
        self.__kolibri_home_value.value = bytes(kolibri_home, encoding="ascii")
        if kolibri_home is None:
            self.__kolibri_home_set_event.clear()
        else:
            self.__kolibri_home_set_event.set()
        self.push_has_changes()

    def await_kolibri_home(self) -> str:
        self.__kolibri_home_set_event.wait()
        return self.kolibri_home


class KolibriServiceProcess(multiprocessing.Process):
    PROCESS_NAME: typing.Optional[str] = None
    ENABLE_LOGGING: bool = True

    __context: KolibriServiceContext

    def __init__(self, context: KolibriServiceContext):
        self.__context = context
        super().__init__()

    @property
    def context(self):
        return self.__context

    def run(self):
        from kolibri_app.globals import init_logging
        from setproctitle import setproctitle

        if self.PROCESS_NAME:
            setproctitle(self.PROCESS_NAME)

        if self.PROCESS_NAME and self.ENABLE_LOGGING:
            init_logging("{}.txt".format(self.PROCESS_NAME))
