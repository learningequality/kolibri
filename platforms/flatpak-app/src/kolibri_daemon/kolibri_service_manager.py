from __future__ import annotations

import multiprocessing
import typing
from enum import auto
from enum import Enum

from .kolibri_service.context import KolibriServiceContext
from .kolibri_service.context import KolibriServiceProcess
from .kolibri_service.django_process import DjangoProcess
from .kolibri_service.setup_process import SetupProcess
from .kolibri_service.stop_process import StopProcess


class KolibriServiceManager(object):
    """
    Manages the Kolibri service, starting and stopping it in separate
    processes, and checking for availability.
    """

    __context: KolibriServiceContext
    __command_tx: multiprocessing.connection.Connection
    __command_rx: multiprocessing.connection.Connection
    __launcher_process: LauncherProcess

    def __init__(self):
        self.__context = KolibriServiceContext()
        self.__command_rx, self.__command_tx = multiprocessing.Pipe(duplex=False)
        self.__launcher_process = LauncherProcess(
            self.__context, command_rx=self.__command_rx
        )

    @property
    def context(self) -> KolibriServiceContext:
        return self.__context

    def init(self):
        self.__launcher_process.start()

    def __send_command(self, command: LauncherProcess.Command):
        self.__command_tx.send(command)

    def start_kolibri(self):
        self.__send_command(LauncherProcess.Command.START_KOLIBRI)

    def stop_kolibri(self):
        self.__send_command(LauncherProcess.Command.STOP_KOLIBRI)

    def shutdown(self):
        self.__send_command(LauncherProcess.Command.SHUTDOWN)

    def join(self):
        self.__launcher_process.join()


class LauncherProcess(KolibriServiceProcess):
    """
    LauncherProcess is a process that spawns other processes. This is useful
    because it has less global context than the kolibri-daemon main process.
    """

    PROCESS_NAME: str = "kolibri-daemon-launcher"
    ENABLE_LOGGING: bool = False

    __command_rx: multiprocessing.connection.Connection
    __keep_alive: bool
    __commands: dict

    __django_process: typing.Optional[DjangoProcess] = None
    __setup_process: typing.Optional[SetupProcess] = None
    __stop_process: typing.Optional[StopProcess] = None

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

        from .kolibri_utils import kolibri_update_from_home_template

        kolibri_update_from_home_template()

        while self.__keep_alive:
            self.__cleanup()
            if not self.__run_next_command(timeout=5):
                self.__shutdown()

        self.__join()

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

    def __run_command(self, command: LauncherProcess.Command):
        fn = self.__commands.get(command, None)

        if not callable(fn):
            raise ValueError("Unknown command '{}'".format(command))

        return fn()

    def __start_kolibri(self):
        if self.__django_process and self.__django_process.is_alive():
            return

        if not self.__setup_process:
            self.__setup_process = SetupProcess(self.context)
            self.__setup_process.start()

        self.__django_process = DjangoProcess(self.context)
        self.__django_process.start()

    def __stop_kolibri(self):
        if not self.context.is_running():
            return
        elif self.__stop_process and self.__stop_process.is_alive():
            return
        else:
            self.__stop_process = StopProcess(self.context)
            self.__stop_process.start()

    def __shutdown(self):
        self.__stop_kolibri()
        self.__keep_alive = False

    def __join(self):
        if self.__setup_process and self.__setup_process.is_alive():
            self.__setup_process.join()
        if self.__django_process and self.__django_process.is_alive():
            self.__django_process.join()
        if self.__stop_process and self.__stop_process.is_alive():
            self.__stop_process.join()

    def __cleanup(self):
        # Periodically clean up finished processes without blocking.
        if self.__setup_process and not self.__setup_process.is_alive():
            self.__setup_process = None

        if self.__django_process and not self.__django_process.is_alive():
            # Sometimes django_process exits prematurely, so we need to update
            # context from here...
            if not self.context.is_stopped:
                self.__django_process.reset_context()
            self.__django_process = None

        if self.__stop_process and not self.__stop_process.is_alive():
            self.__stop_process = None
