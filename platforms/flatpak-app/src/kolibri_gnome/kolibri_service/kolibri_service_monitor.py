import logging

logger = logging.getLogger(__name__)

import multiprocessing
import time

from ctypes import c_bool


class KolibriServiceMonitorProcess(multiprocessing.Process):
    def __init__(self, stopped_event):
        self.__stopped_event = stopped_event
        self.__loaded_event = multiprocessing.Event()
        self.__loaded_success = multiprocessing.Value(c_bool)
        super().__init__(daemon=True)

    @property
    def loaded_event(self):
        return self.__loaded_event

    def is_kolibri_loading(self):
        return not self.__loaded_event.is_set()

    def is_kolibri_loaded(self):
        return self.__loaded_event.is_set() and self.__loaded_success.value

    def wait_for_kolibri(self):
        return self.__loaded_event.wait()

    def run(self):
        from ..kolibri_globals import is_kolibri_responding

        while not is_kolibri_responding():
            # There is a corner case here where Kolibri may be running (lock
            # file is created), but responding at a different URL than we
            # expect. This is unlikely, so we are ignoring it here.
            if self.__stopped_event.is_set():
                logger.warning("Kolibri service has died")
                self.__loaded_success.value = False
                return
            time.sleep(1)

        logger.info("Kolibri service is responding")
        self.__loaded_success.value = True
        self.__loaded_event.set()
