from __future__ import annotations

from enum import Enum

from .kolibri_service import KolibriServiceContext
from .kolibri_service_process_main import KolibriServiceMainProcess
from .kolibri_service_process_setup import KolibriServiceSetupProcess
from .kolibri_service_process_stop import KolibriServiceStopProcess
from .utils import kolibri_update_from_home_template


class KolibriServiceManager(KolibriServiceContext):
    """
    Manages the Kolibri service, starting and stopping it in separate
    processes, and checking for availability.
    """

    __main_process: KolibriServiceMainProcess = None
    __setup_process: KolibriServiceSetupProcess = None
    __stop_process: KolibriServiceStopProcess = None

    class Status(Enum):
        NONE = 1
        STARTING = 2
        STOPPED = 3
        STARTED = 4
        ERROR = 5

    def __init__(self):
        super().__init__()

        self.is_stopped = True

    def init(self):
        kolibri_update_from_home_template()

    @property
    def status(self) -> KolibriServiceManager.Status:
        if self.is_starting:
            return self.Status.STARTING
        elif self.start_result == self.StartResult.SUCCESS:
            return self.Status.STARTED
        elif self.start_result == self.StartResult.ERROR:
            return self.Status.ERROR
        elif self.setup_result == self.SetupResult.ERROR:
            return self.Status.ERROR
        elif self.is_stopped:
            return self.Status.STOPPED
        else:
            return self.Status.NONE

    def is_running(self) -> bool:
        return self.status in [self.Status.STARTING, self.Status.STARTED]

    def get_kolibri_url(self, **kwargs) -> str:
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
        if self.__setup_process and self.__setup_process.is_alive():
            self.__setup_process.join()
        if self.__main_process and self.__main_process.is_alive():
            self.__main_process.join()
        if self.__stop_process and self.__stop_process.is_alive():
            self.__stop_process.join()

    def cleanup(self):
        # Clean up finished processes to keep things tidy, without blocking.
        if self.__setup_process and not self.__setup_process.is_alive():
            self.__setup_process = None
        if self.__main_process and not self.__main_process.is_alive():
            self.__main_process = None
        if self.__stop_process and not self.__stop_process.is_alive():
            self.__stop_process = None

    def start_kolibri(self):
        if self.__main_process and self.__main_process.is_alive():
            return

        if not self.__setup_process:
            self.__setup_process = KolibriServiceSetupProcess(self)
            self.__setup_process.start()

        self.__main_process = KolibriServiceMainProcess(self)
        self.__main_process.start()

    def stop_kolibri(self):
        if not self.is_running():
            return
        elif self.__stop_process and self.__stop_process.is_alive():
            return
        else:
            self.__stop_process = KolibriServiceStopProcess(self)
            self.__stop_process.start()

    def pop_has_changes(self) -> bool:
        # The main process might exit prematurely. If that happens, we should
        # set is_stopped accordingly.
        if (
            self.__main_process
            and not self.__main_process.is_alive()
            and not self.is_stopped
        ):
            self.is_starting = False
            if self.start_result != self.StartResult.ERROR:
                self.start_result = None
            self.is_stopped = True
            self.base_url = ""
            self.app_key = ""
        return super().pop_has_changes()
