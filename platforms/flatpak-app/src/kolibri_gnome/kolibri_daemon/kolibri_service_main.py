import json
import multiprocessing
import os
import threading
from collections import Mapping
from contextlib import contextmanager

from kolibri.utils.conf import KOLIBRI_HOME

from .content_extensions import ContentExtensionsList

from ..globals import init_logging

# TODO: We need to use multiprocessing because Kolibri occasionally calls
#       os.kill against its own process ID.


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

    def start(self):
        super().start()
        watch_thread = KolibriServiceMainProcessWatchThread(self)
        watch_thread.start()

    def run(self):
        init_logging('kolibri-daemon-main.txt')
        with self.__set_is_stopped_on_exit():
            self.__run_kolibri_start()

    @contextmanager
    def __set_is_stopped_on_exit(self):
        self.__context.is_stopped = False
        try:
            yield
        finally:
            self._set_is_stopped()

    def _set_is_stopped(self):
        self.__context.is_starting = False
        self.__context.is_stopped = True
        self.__context.base_url = ""
        self.__context.app_key = ""

    def __run_kolibri_start(self):
        self.__context.await_is_stopped()
        setup_result = self.__context.await_setup_result()

        if setup_result != self.__context.SetupResult.SUCCESS:
            self.__context.is_starting = False
            return

        self.__context.is_starting = True
        self.__context.is_stopped = False
        self.__context.start_result = None

        self.__active_extensions.update_kolibri_environ(os.environ)

        from kolibri.plugins.registry import registered_plugins
        from kolibri.utils.cli import initialize, setup_logging, start_with_ready_cb

        registered_plugins.register_plugins(["kolibri.plugins.app"])

        setup_logging(debug=False)
        initialize()

        self.__automatic_provisiondevice()
        self.__update_app_key()
        self.__update_kolibri_home()

        try:
            KOLIBRI_HTTP_PORT = 0
            start_with_ready_cb(
                port=KOLIBRI_HTTP_PORT,
                background=False,
                ready_cb=self.__kolibri_ready_cb,
            )
        except SystemExit:
            # Kolibri sometimes calls sys.exit, but we don't want to exit
            self.__context.start_result = self.__context.StartResult.ERROR
            pass
        except Exception as error:
            self.__context.start_result = self.__context.StartResult.ERROR
            raise error

    def __kolibri_ready_cb(self, urls, bind_addr=None, bind_port=None):
        self.__context.base_url = urls[0]
        self.__context.start_result = self.__context.StartResult.SUCCESS
        self.__context.is_starting = False

    def __update_app_key(self):
        from kolibri.core.device.models import DeviceAppKey

        self.__context.app_key = DeviceAppKey.get_app_key()

    def __update_kolibri_home(self):
        self.__context.kolibri_home = KOLIBRI_HOME

    def __automatic_provisiondevice(self):
        import logging

        logger = logging.getLogger(__name__)

        from kolibri.core.device.utils import device_provisioned
        from kolibri.dist.django.core.management import call_command

        AUTOMATIC_PROVISION_FILE = os.path.join(
            KOLIBRI_HOME, "automatic_provision.json"
        )

        if not os.path.exists(AUTOMATIC_PROVISION_FILE):
            return
        elif device_provisioned():
            return

        try:
            with open(AUTOMATIC_PROVISION_FILE, "r") as f:
                logger.info("Running provisiondevice from 'automatic_provision.json'")
                options = json.load(f)
        except ValueError as e:
            logger.error(
                "Attempted to load 'automatic_provision.json' but failed to parse JSON:\n{}".format(
                    e
                )
            )
        except FileNotFoundError:
            options = None

        if isinstance(options, Mapping):
            options.setdefault("superusername", None)
            options.setdefault("superuserpassword", None)
            options.setdefault("preset", "nonformal")
            options.setdefault("language_id", None)
            options.setdefault("facility_settings", {})
            options.setdefault("device_settings", {})
            call_command("provisiondevice", interactive=False, **options)


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
