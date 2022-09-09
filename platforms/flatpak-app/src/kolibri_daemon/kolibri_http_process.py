from __future__ import annotations

import logging
import multiprocessing
from enum import auto
from enum import Enum

from kolibri.dist.magicbus import ProcessBus
from kolibri.dist.magicbus.plugins import SimplePlugin
from kolibri_app.globals import KOLIBRI_HOME_PATH

from .kolibri_service_context import KolibriServiceContext
from .kolibri_service_context import KolibriServiceProcess
from .kolibri_utils import init_kolibri

logger = logging.getLogger(__name__)


class KolibriHttpProcess(KolibriServiceProcess):
    """
    Manages a KolibriProcessBus, starting and stopping it according to commands
    sent by the owning process. Updates the provided KolibriServiceContext
    according to Kolibri's state.
    """

    PROCESS_NAME: str = "kolibri-daemon-http"

    __command_rx: multiprocessing.connection.Connection
    __keep_alive: bool
    __commands: dict

    __kolibri_bus: ProcessBus

    class Command(Enum):
        START_KOLIBRI = auto()
        STOP_KOLIBRI = auto()
        SHUTDOWN = auto()

    def __init__(
        self, *args, command_rx: multiprocessing.connection.Connection, **kwargs
    ):
        super().__init__(*args, **kwargs)
        self.__command_rx = command_rx
        self.__keep_alive = True
        self.__commands = {
            self.Command.START_KOLIBRI: self.__start_kolibri,
            self.Command.STOP_KOLIBRI: self.__stop_kolibri,
            self.Command.SHUTDOWN: self.__shutdown,
        }

    def run(self):
        super().run()

        init_kolibri()

        from kolibri.utils.conf import OPTIONS
        from kolibri.utils.server import KolibriProcessBus

        self.__update_kolibri_context()

        self.__kolibri_bus = KolibriProcessBus(
            port=OPTIONS["Deployment"]["HTTP_PORT"],
            zip_port=OPTIONS["Deployment"]["ZIP_CONTENT_PORT"],
        )

        kolibri_daemon_plugin = _KolibriDaemonPlugin(self.__kolibri_bus, self.context)
        kolibri_daemon_plugin.subscribe()

        self.context.is_bus_ready = True

        while self.__keep_alive:
            if not self.__run_next_command(timeout=5):
                self.__shutdown()

    def __run_next_command(self, timeout: int) -> bool:
        has_next = self.__command_rx.poll(timeout)

        if not has_next:
            return True

        try:
            command = self.__command_rx.recv()
        except EOFError:
            return False

        try:
            self.__run_command(command)
        except ValueError:
            return False

        return True

    def __run_command(self, command: KolibriHttpProcess.Command):
        fn = self.__commands.get(command, None)

        if not callable(fn):
            raise ValueError("Unknown command '{}'".format(command))

        return fn()

    def __start_kolibri(self):
        if _process_bus_has_transition(self.__kolibri_bus, "START"):
            self.context.is_starting = True
            self.__kolibri_bus.transition("START")
        elif self.__kolibri_bus.state != "START":
            self.context.start_error = self.context.StartError.INVALID_STATE
            logger.warning(
                f"Kolibri is unable to start because its state is '{self.__kolibri_bus.state}'"
            )

    def __stop_kolibri(self):
        if _process_bus_has_transition(self.__kolibri_bus, "IDLE"):
            self.__kolibri_bus.transition("IDLE")
        elif self.__kolibri_bus.state != "IDLE":
            logger.warning(
                f"Kolibri is unable to stop because its state is '{self.__kolibri_bus.state}"
            )

    def __exit_kolibri(self):
        self.__kolibri_bus.transition("EXITED")

    def __shutdown(self):
        self.__exit_kolibri()
        self.__keep_alive = False

    def stop(self):
        pass

    def __update_kolibri_context(self):
        import kolibri
        from kolibri.core.device.models import DeviceAppKey

        self.context.app_key = DeviceAppKey.get_app_key()
        self.context.kolibri_home = KOLIBRI_HOME_PATH.as_posix()
        self.context.kolibri_version = kolibri.__version__


class _KolibriDaemonPlugin(SimplePlugin):
    __context: KolibriServiceContext

    def __init__(self, bus: ProcessBus, context: KolibriServiceContext):
        self.bus = bus
        self.__context = context

    @property
    def context(self):
        return self.__context

    def SERVING(self, port: int):
        from kolibri.utils.server import get_urls

        _, base_urls = get_urls(listen_port=port)

        self.context.base_url = base_urls[0]
        self.context.start_error = self.context.StartError.NONE
        self.context.is_started = True
        self.context.is_starting = False

    def ZIP_SERVING(self, zip_port: int):
        from kolibri.utils.server import get_urls

        _, zip_urls = get_urls(listen_port=zip_port)

        self.context.extra_url = zip_urls[0]

    def START_ERROR(self, error_class, error, traceback):
        # TODO: We could report different types of errors here.
        # Kolibri transitions to the EXIT state from here. This is potentially
        # problematic because it is unrecoverable, but we don't allow a client
        # to restart Kolibri when it is in an error state either.
        self.context.start_error = self.context.StartError.ERROR
        logger.error(f"Kolibri failed to start due to an error: {error}")

    def STOP(self):
        self.context.base_url = ""
        self.context.extra_url = ""
        self.context.is_starting = False
        self.context.is_started = False
        self.context.is_stopped = True


def _process_bus_has_transition(bus: ProcessBus, to_state: str) -> bool:
    return (bus.state, to_state) in bus.transitions
