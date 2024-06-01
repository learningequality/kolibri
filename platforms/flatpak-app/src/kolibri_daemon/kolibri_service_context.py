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
    EXTRA_URL_LENGTH: int = 1024
    KOLIBRI_HOME_LENGTH: int = 4096

    __changed_event: multiprocessing.synchronize.Event

    __is_bus_ready_value: multiprocessing.sharedctypes.Synchronized[c_bool]
    __is_bus_ready_set_event: multiprocessing.synchronize.Event

    __is_starting_value: multiprocessing.sharedctypes.Synchronized[c_bool]
    __is_starting_set_event: multiprocessing.synchronize.Event

    __is_started_value: multiprocessing.sharedctypes.Synchronized[c_bool]
    __is_started_set_event: multiprocessing.synchronize.Event

    __start_error_value: multiprocessing.sharedctypes.Synchronized[c_int]
    __start_error_set_event: multiprocessing.synchronize.Event

    __app_key_value: multiprocessing.sharedctypes.SynchronizedArray[c_char]
    __app_key_set_event: multiprocessing.synchronize.Event

    __base_url_value: multiprocessing.sharedctypes.SynchronizedArray[c_char]
    __base_url_set_event: multiprocessing.synchronize.Event

    __kolibri_home_value: multiprocessing.sharedctypes.SynchronizedArray[c_char]
    __kolibri_home_set_event: multiprocessing.synchronize.Event

    __kolibri_version_value: multiprocessing.sharedctypes.SynchronizedArray[c_char]
    __kolibri_version_set_event: multiprocessing.synchronize.Event

    class Status(Enum):
        NONE = auto()
        STARTING = auto()
        STOPPED = auto()
        STARTED = auto()
        ERROR = auto()

    class StartError(Enum):
        NONE = auto()
        ERROR = auto()
        INVALID_STATE = auto()

    def __init__(self):
        self.__changed_event = multiprocessing.Event()

        self.__is_bus_ready_value = multiprocessing.Value(c_bool)
        self.__is_bus_ready_set_event = multiprocessing.Event()

        self.__is_starting_value = multiprocessing.Value(c_bool)
        self.__is_starting_set_event = multiprocessing.Event()

        self.__is_started_value = multiprocessing.Value(c_bool)
        self.__is_started_set_event = multiprocessing.Event()

        self.__start_error_value = multiprocessing.Value(c_int)
        self.__start_error_set_event = multiprocessing.Event()

        self.__is_stopped_value = multiprocessing.Value(c_bool)
        self.__is_stopped_set_event = multiprocessing.Event()

        self.__is_exited_value = multiprocessing.Value(c_bool)
        self.__is_exited_set_event = multiprocessing.Event()

        self.__app_key_value = multiprocessing.Array(c_char, self.APP_KEY_LENGTH)
        self.__app_key_set_event = multiprocessing.Event()

        self.__base_url_value = multiprocessing.Array(c_char, self.BASE_URL_LENGTH)
        self.__base_url_set_event = multiprocessing.Event()

        self.__extra_url_value = multiprocessing.Array(c_char, self.EXTRA_URL_LENGTH)
        self.__extra_url_set_event = multiprocessing.Event()

        self.__kolibri_home_value = multiprocessing.Array(
            c_char, self.KOLIBRI_HOME_LENGTH
        )
        self.__kolibri_home_set_event = multiprocessing.Event()

        self.__kolibri_version_value = multiprocessing.Array(
            c_char, self.KOLIBRI_HOME_LENGTH
        )
        self.__kolibri_version_set_event = multiprocessing.Event()

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
    def is_bus_ready(self) -> typing.Optional[bool]:
        if self.__is_bus_ready_set_event.is_set():
            return bool(self.__is_bus_ready_value.value)
        else:
            return None

    @is_bus_ready.setter
    def is_bus_ready(self, is_bus_ready: typing.Optional[bool]):
        if is_bus_ready is None:
            self.__is_bus_ready_set_event.clear()
            self.__is_bus_ready_value.value = False  # type: ignore[assignment]
        else:
            self.__is_bus_ready_value.value = bool(is_bus_ready)  # type: ignore[assignment]
            self.__is_bus_ready_set_event.set()
        self.push_has_changes()

    def await_is_bus_ready(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[bool]:
        self.__is_bus_ready_set_event.wait(timeout)
        return self.is_bus_ready

    @property
    def is_starting(self) -> typing.Optional[bool]:
        if self.__is_starting_set_event.is_set():
            return bool(self.__is_starting_value.value)
        else:
            return None

    @is_starting.setter
    def is_starting(self, is_starting: typing.Optional[bool]):
        if is_starting is None:
            self.__is_starting_set_event.clear()
            self.__is_starting_value.value = False  # type: ignore[assignment]
        else:
            self.__is_starting_value.value = bool(is_starting)  # type: ignore[assignment]
            self.__is_starting_set_event.set()
        self.push_has_changes()

    def await_is_starting(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[bool]:
        self.__is_starting_set_event.wait(timeout)
        return self.is_starting

    @property
    def is_started(self) -> typing.Optional[bool]:
        if self.__is_started_set_event.is_set():
            return bool(self.__is_started_value.value)
        else:
            return None

    @is_started.setter
    def is_started(self, is_started: typing.Optional[bool]):
        if is_started is None:
            self.__is_started_set_event.clear()
            self.__is_started_value.value = False  # type: ignore[assignment]
        else:
            self.__is_started_value.value = bool(is_started)  # type: ignore[assignment]
            self.__is_started_set_event.set()
        self.push_has_changes()

    def await_is_started(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[bool]:
        self.__is_started_set_event.wait(timeout)
        return self.is_started

    @property
    def is_stopped(self) -> typing.Optional[bool]:
        if self.__is_stopped_set_event.is_set():
            return bool(self.__is_stopped_value.value)
        else:
            return None

    @is_stopped.setter
    def is_stopped(self, is_stopped: typing.Optional[bool]):
        if is_stopped is None:
            self.__is_stopped_set_event.clear()
            self.__is_stopped_value.value = False  # type: ignore[assignment]
        else:
            self.__is_stopped_value.value = bool(is_stopped)  # type: ignore[assignment]
            self.__is_stopped_set_event.set()
        self.push_has_changes()

    def await_is_stopped(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[bool]:
        self.__is_stopped_set_event.wait(timeout)
        return self.is_stopped

    @property
    def is_exited(self) -> typing.Optional[bool]:
        if self.__is_exited_set_event.is_set():
            return bool(self.__is_exited_value.value)
        else:
            return None

    @is_exited.setter
    def is_exited(self, is_exited: typing.Optional[bool]):
        if is_exited is None:
            self.__is_exited_set_event.clear()
            self.__is_exited_value.value = False  # type: ignore[assignment]
        else:
            self.__is_exited_value.value = bool(is_exited)  # type: ignore[assignment]
            self.__is_exited_set_event.set()
        self.push_has_changes()

    def await_is_exited(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[bool]:
        self.__is_exited_set_event.wait(timeout)
        return self.is_exited

    @property
    def start_error(self) -> KolibriServiceContext.StartError:
        if self.__start_error_set_event.is_set():
            return self.StartError(self.__start_error_value.value)
        else:
            return self.StartError.NONE

    @start_error.setter
    def start_error(
        self, start_error: typing.Optional[KolibriServiceContext.StartError]
    ):
        if start_error is None:
            self.__start_error_set_event.clear()
            self.__start_error_value.value = 0  # type: ignore[assignment]
        else:
            self.__start_error_value.value = start_error.value  # type: ignore[assignment]
            self.__start_error_set_event.set()
        self.push_has_changes()

    def await_start_error(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[KolibriServiceContext.StartError]:
        self.__start_error_set_event.wait(timeout)
        return self.start_error

    @property
    def app_key(self) -> typing.Optional[str]:
        if self.__app_key_set_event.is_set():
            return self.__app_key_value.value.decode("ascii")  # type: ignore[attr-defined]
        else:
            return None

    @app_key.setter
    def app_key(self, app_key: typing.Optional[str]):
        if app_key is None:
            self.__app_key_set_event.clear()
            self.__app_key_value.value = None  # type: ignore[attr-defined]
        else:
            self.__app_key_value.value = bytes(app_key, encoding="ascii")  # type: ignore[attr-defined]
            self.__app_key_set_event.set()
        self.push_has_changes()

    def await_app_key(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[str]:
        self.__app_key_set_event.wait(timeout)
        return self.app_key

    @property
    def base_url(self) -> typing.Optional[str]:
        if self.__base_url_set_event.is_set():
            return self.__base_url_value.value.decode("ascii")  # type: ignore[attr-defined]
        else:
            return None

    @base_url.setter
    def base_url(self, base_url: typing.Optional[str]):
        if base_url is None:
            self.__base_url_set_event.clear()
            self.__base_url_value.value = None  # type: ignore[attr-defined]
        else:
            self.__base_url_value.value = bytes(base_url, encoding="ascii")  # type: ignore[attr-defined]
            self.__base_url_set_event.set()
        self.push_has_changes()

    def await_base_url(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[str]:
        self.__base_url_set_event.wait(timeout)
        return self.base_url

    @property
    def extra_url(self) -> typing.Optional[str]:
        if self.__extra_url_set_event.is_set():
            return self.__extra_url_value.value.decode("ascii")  # type: ignore[attr-defined]
        else:
            return None

    @extra_url.setter
    def extra_url(self, extra_url: typing.Optional[str]):
        if extra_url is None:
            self.__extra_url_set_event.clear()
            self.__extra_url_value.value = None  # type: ignore[attr-defined]
        else:
            self.__extra_url_value.value = bytes(extra_url, encoding="ascii")  # type: ignore[attr-defined]
            self.__extra_url_set_event.set()
        self.push_has_changes()

    def await_extra_url(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[str]:
        self.__extra_url_set_event.wait(timeout)
        return self.extra_url

    @property
    def kolibri_home(self) -> typing.Optional[str]:
        if self.__kolibri_home_set_event.is_set():
            return self.__kolibri_home_value.value.decode("ascii")  # type: ignore[attr-defined]
        else:
            return None

    @kolibri_home.setter
    def kolibri_home(self, kolibri_home: typing.Optional[str]):
        if kolibri_home is None:
            self.__kolibri_home_set_event.clear()
            self.__kolibri_home_value.value = None  # type: ignore[attr-defined]
        else:
            self.__kolibri_home_value.value = bytes(kolibri_home, encoding="ascii")  # type: ignore[attr-defined]
            self.__kolibri_home_set_event.set()
        self.push_has_changes()

    def await_kolibri_home(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[str]:
        self.__kolibri_home_set_event.wait(timeout)
        return self.kolibri_home

    @property
    def kolibri_version(self) -> typing.Optional[str]:
        if self.__kolibri_version_set_event.is_set():
            return self.__kolibri_version_value.value.decode("ascii")  # type: ignore[attr-defined]
        else:
            return None

    @kolibri_version.setter
    def kolibri_version(self, kolibri_version: typing.Optional[str]):
        if kolibri_version is None:
            self.__kolibri_version_set_event.clear()
            self.__kolibri_version_value.value = None  # type: ignore[attr-defined]
        else:
            self.__kolibri_version_value.value = bytes(kolibri_version, encoding="ascii")  # type: ignore[attr-defined]
            self.__kolibri_version_set_event.set()
        self.push_has_changes()

    def await_kolibri_version(
        self, timeout: typing.Optional[int] = None
    ) -> typing.Optional[str]:
        self.__kolibri_version_set_event.wait(timeout)
        return self.kolibri_version

    @property
    def status(self) -> KolibriServiceContext.Status:
        if self.is_starting:
            return self.Status.STARTING
        elif self.is_started:
            return self.Status.STARTED
        elif self.start_error != self.StartError.NONE:
            return self.Status.ERROR
        else:
            return self.Status.STOPPED

    def is_running(self) -> bool:
        return self.status in [self.Status.STARTING, self.Status.STARTED]

    def has_error(self) -> bool:
        return self.start_error != self.StartError.NONE


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
