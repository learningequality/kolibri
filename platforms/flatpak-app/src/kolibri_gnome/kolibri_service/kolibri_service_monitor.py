import logging

logger = logging.getLogger(__name__)

import multiprocessing
import time


class KolibriServiceMonitorProcess(multiprocessing.Process):
    def __init__(self, context):
        self.__context = context
        super().__init__()

    def run(self):
        from ..kolibri_globals import is_kolibri_responding

        self.__context.await_is_starting()

        while not is_kolibri_responding():
            if self.__context.get_is_stopped():
                logger.warning("Kolibri service has died")
                self.__context.set_is_responding(False)
                return
            time.sleep(1)

        logger.info("Kolibri service is responding")
        self.__context.set_is_responding(True)
