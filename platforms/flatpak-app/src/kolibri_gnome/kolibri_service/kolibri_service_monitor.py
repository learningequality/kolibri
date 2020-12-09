import logging

logger = logging.getLogger(__name__)

import multiprocessing
import time


class KolibriServiceMonitorProcess(multiprocessing.Process):
    """
    Polls Kolibri at the expected URL to detect when it is responding to
    requests.
    - Sets context.is_responding to True when Kolibri is responding to
      requests, or to False if Kolibri fails to start.
    """

    def __init__(self, context):
        self.__context = context
        super().__init__()

    def run(self):
        from ..kolibri_globals import is_kolibri_responding

        base_url = self.__context.await_base_url()

        self.__context.await_is_starting()

        while not is_kolibri_responding(base_url):
            if self.__context.is_stopped:
                logger.warning("Kolibri service has died")
                self.__context.is_responding = False
                return
            time.sleep(1)

        logger.info("Kolibri service is responding")
        self.__context.is_responding = True
