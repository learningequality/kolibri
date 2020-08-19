import multiprocessing
import os

from contextlib import contextmanager

from .content_extensions import ContentExtensionsList


class KolibriServiceMainProcess(multiprocessing.Process):
    """
    Starts Kolibri in the foreground and shares its device app key.
    - Sets context.is_starting to True when Kolibri is being started.
    - Sets context.is_stopped to True when Kolibri stops for any reason.
    """

    def __init__(self, context):
        self.__context = context
        self.__active_extensions = ContentExtensionsList.from_flatpak_info()
        super().__init__()

    def run(self):
        with self.__set_is_stopped_on_exit():
            self.__run_kolibri_start()

    @contextmanager
    def __set_is_stopped_on_exit(self):
        self.__context.is_stopped = False
        try:
            yield
        finally:
            self.__context.is_stopped = True

    def __run_kolibri_start(self):
        if not self.__context.await_setup_result():
            self.__context.is_starting = False
            return

        self.__context.is_starting = True

        self.__active_extensions.update_kolibri_environ(os.environ)

        from kolibri.plugins.registry import registered_plugins
        from kolibri.utils.cli import initialize, setup_logging, start

        registered_plugins.register_plugins(["kolibri.plugins.app"])

        setup_logging(debug=False)
        initialize()

        from kolibri.core.device.models import DeviceAppKey

        self.__context.app_key = DeviceAppKey.get_app_key()

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
