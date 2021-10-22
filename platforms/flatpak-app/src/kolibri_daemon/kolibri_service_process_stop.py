from __future__ import annotations

import multiprocessing

from kolibri_app.globals import init_logging

from .kolibri_service import KolibriServiceContext


class KolibriServiceStopProcess(multiprocessing.Process):
    """
    Stops Kolibri using the cli command. This runs as a separate process to
    avoid blocking the rest of the program while Kolibri is stopping.
    """

    PROCESS_NAME: str = "kolibri-daemon-stop"

    __context: KolibriServiceContext = None

    def __init__(self, context: KolibriServiceContext):
        self.__context = context
        super().__init__()

    def run(self):
        from setproctitle import setproctitle

        setproctitle(self.PROCESS_NAME)

        if self.__context.is_stopped:
            return
        elif self.__context.await_start_result() != self.__context.StartResult.SUCCESS:
            return

        init_logging("{}.txt".format(self.PROCESS_NAME))

        from kolibri.utils.cli import stop

        try:
            stop.callback()
        except SystemExit:
            # Kolibri calls sys.exit here, but we don't want to exit
            pass

        self.__context.is_stopped = True
