from __future__ import annotations

import multiprocessing

from .kolibri_service.context import KolibriServiceContext
from .kolibri_service.django_process import DjangoProcess


class KolibriServiceManager(object):
    """
    Manages the Kolibri service, starting and stopping it in separate
    processes, and checking for availability.
    """

    __context: KolibriServiceContext
    __command_tx: multiprocessing.connection.Connection
    __command_rx: multiprocessing.connection.Connection
    __django_process: DjangoProcess

    def __init__(self):
        self.__context = KolibriServiceContext()
        self.__command_rx, self.__command_tx = multiprocessing.Pipe(duplex=False)
        self.__django_process = DjangoProcess(
            self.__context, command_rx=self.__command_rx
        )

    @property
    def context(self) -> KolibriServiceContext:
        return self.__context

    def init(self):
        self.__django_process.start()

    def __send_command(self, command: DjangoProcess.Command):
        self.__command_tx.send(command)

    def start_kolibri(self):
        self.__send_command(DjangoProcess.Command.START_KOLIBRI)

    def stop_kolibri(self):
        self.__send_command(DjangoProcess.Command.STOP_KOLIBRI)

    def shutdown(self):
        self.__send_command(DjangoProcess.Command.SHUTDOWN)

    def join(self):
        self.__django_process.join()
