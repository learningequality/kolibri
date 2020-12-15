import multiprocessing


class KolibriServiceStopProcess(multiprocessing.Process):
    """
    Stops Kolibri using the cli command. This runs as a separate process to
    avoid blocking the rest of the program while Kolibri is stopping.
    """

    def __init__(self, context):
        self.__context = context
        super().__init__()

    def run(self):
        if self.__context.await_start_result() != self.__context.StartResult.SUCCESS:
            return

        from kolibri.utils.cli import stop

        try:
            stop.callback()
        except SystemExit:
            # Kolibri calls sys.exit here, but we don't want to exit
            pass
