import multiprocessing
import os
import threading
from contextlib import contextmanager
from pathlib import Path

from ..globals import init_kolibri
from ..globals import init_logging
from ..globals import KOLIBRI_HOME_PATH
from .content_extensions import ContentExtensionsList

# TODO: We need to use multiprocessing because Kolibri occasionally calls
#       os.kill against its own process ID.


class KolibriServiceMainProcess(multiprocessing.Process):
    """
    Starts Kolibri in the foreground and shares its device app key.
    - Sets context.is_starting to True when Kolibri is being started.
    - Sets context.is_stopped to True when Kolibri stops for any reason.
    """

    PROCESS_NAME = "kolibri-daemon-main"

    def __init__(self, context):
        self.__context = context
        self.__active_extensions = ContentExtensionsList.from_flatpak_info()
        super().__init__()

    def start(self):
        super().start()
        watch_thread = KolibriServiceMainProcessWatchThread(self)
        watch_thread.start()

    def run(self):
        from setproctitle import setproctitle

        setproctitle(self.PROCESS_NAME)

        self.__run_kolibri_start()

    def _set_is_stopped(self, start_result=None):
        self.__context.is_starting = False
        if self.__context.start_result != self.__context.StartResult.ERROR:
            self.__context.start_result = start_result
        self.__context.is_stopped = True
        self.__context.base_url = ""
        self.__context.app_key = ""

    def __run_kolibri_start(self):
        self.__context.await_is_stopped()
        setup_result = self.__context.await_setup_result()

        if setup_result != self.__context.SetupResult.SUCCESS:
            self.__context.is_starting = False
            return

        init_logging("{}.txt".format(self.PROCESS_NAME))

        self.__context.is_starting = True
        self.__context.is_stopped = False
        self.__context.start_result = None

        # Crudely ignore if there is already a server.pid file
        # This is probably safe because we are inside a (unique) dbus service.
        try:
            KOLIBRI_HOME_PATH.joinpath("server.pid").unlink()
        except FileNotFoundError:
            pass

        self.__active_extensions.update_kolibri_environ(os.environ)

        from kolibri.utils.cli import start_with_ready_cb, stop
        from kolibri.utils.conf import OPTIONS

        init_kolibri()

        self.__update_app_key()
        self.__update_kolibri_home()

        try:
            start_with_ready_cb(
                port=OPTIONS["Deployment"]["HTTP_PORT"],
                background=False,
                ready_cb=self.__kolibri_ready_cb,
            )
        except SystemExit:
            # Kolibri sometimes calls sys.exit, but we don't want to stop this process
            self.__context.start_result = self.__context.StartResult.ERROR
            needs_cleanup = True
        except Exception as error:
            self.__context.start_result = self.__context.StartResult.ERROR
            needs_cleanup = True
        else:
            needs_cleanup = False
        finally:
            if needs_cleanup:
                self.__run_kolibri_cleanup()

    def __run_kolibri_cleanup(self):
        from kolibri.utils.cli import stop

        try:
            stop.callback()
        except SystemExit:
            pass

    def __kolibri_ready_cb(self, urls, bind_addr=None, bind_port=None):
        self.__context.base_url = urls[0]
        self.__context.start_result = self.__context.StartResult.SUCCESS
        self.__context.is_starting = False

    def __update_app_key(self):
        from kolibri.core.device.models import DeviceAppKey

        self.__context.app_key = DeviceAppKey.get_app_key()

    def __update_kolibri_home(self):
        self.__context.kolibri_home = KOLIBRI_HOME_PATH.as_posix()


class KolibriServiceMainProcessWatchThread(threading.Thread):
    """
    Because the Kolibri service process may be terminated more agressively than
    we like, we will watch for it to exit with a separate thread in the parent
    process as well.
    """

    def __init__(self, main_process):
        self.__main_process = main_process
        super().__init__()

    def run(self):
        self.__main_process.join()
        self.__main_process._set_is_stopped()
