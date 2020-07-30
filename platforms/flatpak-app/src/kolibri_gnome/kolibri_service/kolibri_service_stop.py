import multiprocessing


class KolibriServiceStopProcess(multiprocessing.Process):
    def __init__(self, loaded_event):
        self.__loaded_event = loaded_event
        super().__init__()

    def run(self):
        self.__loaded_event.wait()
        from kolibri.utils.cli import stop

        try:
            result = stop.callback()
        except SystemExit:
            # Kolibri calls sys.exit here, but we don't want to exit
            pass
