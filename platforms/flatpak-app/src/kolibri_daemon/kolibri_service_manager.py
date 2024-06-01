from __future__ import annotations

import multiprocessing

from .kolibri_http_process import KolibriHttpProcess
from .kolibri_service_context import KolibriServiceContext


class KolibriServiceManager(object):
    """
    Manages the Kolibri service, starting and stopping it in separate
    processes, and checking for availability.
    """

    __context: KolibriServiceContext
    __command_tx: multiprocessing.connection.Connection
    __command_rx: multiprocessing.connection.Connection
    __http_process: KolibriHttpProcess

    def __init__(self):
        self.__context = KolibriServiceContext()
        self.__command_rx, self.__command_tx = multiprocessing.Pipe(duplex=False)
        self.__http_process = KolibriHttpProcess(
            self.__context, command_rx=self.__command_rx
        )

    @property
    def context(self) -> KolibriServiceContext:
        return self.__context

    def init(self):
        self.__http_process.start()

    def is_alive(self) -> bool:
        return self.__http_process.is_alive()

    def __send_command(self, command: KolibriHttpProcess.Command):
        self.__command_tx.send(command)

    def automatic_provision(self):
        self.__send_command(KolibriHttpProcess.Command.AUTOMATIC_PROVISION)

    def start_kolibri(self):
        self.__send_command(KolibriHttpProcess.Command.START_KOLIBRI)

    def stop_kolibri(self):
        self.__send_command(KolibriHttpProcess.Command.STOP_KOLIBRI)

    def shutdown(self):
        self.__send_command(KolibriHttpProcess.Command.SHUTDOWN)

    def join(self):
        self.__http_process.join()
