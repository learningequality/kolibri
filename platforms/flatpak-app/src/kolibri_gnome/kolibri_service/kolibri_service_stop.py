import multiprocessing


class KolibriServiceStopProcess(multiprocessing.Process):
    def __init__(self, context):
        self.__context = context
        super().__init__()

    def run(self):
        if not self.__context.await_is_responding():
            return

        from kolibri.utils.cli import stop

        try:
            stop.callback()
        except SystemExit:
            # Kolibri calls sys.exit here, but we don't want to exit
            pass
