from __future__ import annotations

import os

from kolibri_app.globals import init_kolibri
from kolibri_app.globals import KOLIBRI_HOME_PATH

from .content_extensions import ContentExtensionsList
from .context import KolibriServiceProcess

# TODO: We need to use multiprocessing because Kolibri occasionally calls
#       os.kill against its own process ID.


class DjangoProcess(KolibriServiceProcess):
    """
    Starts Kolibri in the foreground and shares its device app key.
    - Sets context.is_starting to True when Kolibri is being started.
    - Sets context.is_stopped to True when Kolibri stops for any reason.
    """

    PROCESS_NAME: str = "kolibri-daemon-django"

    __active_extensions: ContentExtensionsList = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.__active_extensions = ContentExtensionsList.from_flatpak_info()

    def run(self):
        super().run()

        try:
            self.__run_kolibri_main()
        except Exception:
            self.context.start_result = self.context.StartResult.ERROR
            self.__run_kolibri_cleanup()
        finally:
            self.reset_context()

    def reset_context(self):
        self.context.is_starting = False
        if self.context.start_result != self.context.StartResult.ERROR:
            self.context.start_result = None
        self.context.is_stopped = True
        self.context.base_url = ""
        self.context.app_key = ""

    def __run_kolibri_main(self):
        self.context.await_is_stopped()

        setup_result = self.context.await_setup_result()

        if setup_result != self.context.SetupResult.SUCCESS:
            self.context.is_starting = False
            return

        self.context.is_starting = True
        self.context.is_stopped = False
        self.context.start_result = None

        # Crudely ignore if there is already a server.pid file
        # This is probably safe because we are inside a (unique) dbus service.

        try:
            KOLIBRI_HOME_PATH.joinpath("server.pid").unlink()
        except FileNotFoundError:
            pass

        self.__active_extensions.update_kolibri_environ(os.environ)

        self.__kolibri_start_with_ready_cb()

    def __kolibri_start_with_ready_cb(self):
        from kolibri.utils.cli import start_with_ready_cb
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
            raise Exception("Caught SystemExit")

    def __run_kolibri_cleanup(self):
        from kolibri.utils.cli import stop

        try:
            stop.callback()
        except SystemExit:
            pass

    def __kolibri_ready_cb(
        self, urls: list, bind_addr: str = None, bind_port: int = None
    ):
        self.context.base_url = urls[0]
        self.context.start_result = self.context.StartResult.SUCCESS
        self.context.is_starting = False

    def __update_app_key(self):
        from kolibri.core.device.models import DeviceAppKey

        self.context.app_key = DeviceAppKey.get_app_key()

    def __update_kolibri_home(self):
        self.context.kolibri_home = KOLIBRI_HOME_PATH.as_posix()
