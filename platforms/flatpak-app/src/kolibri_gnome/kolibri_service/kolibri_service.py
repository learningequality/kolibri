# Starts Kolibri, recovering from improper exits if required.

import io
import logging
import os
import signal
import subprocess
import threading
import time

from kolibri.utils import server
from kolibri.utils import cli

from ..globals import KOLIBRI_URL
from .utils import singleton_service


class KolibriServiceThread(threading.Thread):
    def __init__(self, retry_timeout_secs=None):
        self.__retry_timeout_secs = retry_timeout_secs
        self.__kolibri_exitcode = None
        self.__kolibri_process = None
        self.__running = threading.Event()
        super().__init__()

    @property
    def kolibri_exitcode(self):
        return self.__kolibri_exitcode

    def stop_kolibri(self):
        self.__running.clear()
        if self.__kolibri_process:
            self.__kolibri_process.send_signal(signal.SIGINT)

    def run(self):
        self.__running.set()

        while self.__running.is_set():
            try:
                return self.__run()
            except io.BlockingIOError:
                logging.warning("Kolibri is already running in another process.")
                if self.__retry_timeout_secs is not None:
                    logging.info("Trying again in %d seconds...", self.__retry_timeout_secs)
                    time.sleep(self.__retry_timeout_secs)
                else:
                    return None

        logging.info("Kolibri is not starting. Giving up.")

    def __run(self):
        with singleton_service('kolibri', KOLIBRI_URL):
            return self.__run_kolibri_process()

    def __run_kolibri_process(self):
        status = server.get_urls()[0]
        logging.info("Kolibri status (%s): %s", status, cli.status.codes[status])

        if status in [server.STATUS_STOPPED, server.STATUS_FAILED_TO_START, server.STATUS_UNKNOWN]:
            logging.info("Starting Kolibri...")
            self.__kolibri_process = subprocess.Popen(["kolibri", "start", "--foreground"])
        elif status in [server.STATUS_UNCLEAN_SHUTDOWN, server.STATUS_FAILED_TO_START]:
            logging.info("Clearing lock files and starting Kolibri...")
            if os.path.exists(server.STARTUP_LOCK):
                os.remove(server.STARTUP_LOCK)
            if os.path.exists(server.PID_FILE):
                os.remove(server.PID_FILE)
            self.__kolibri_process = subprocess.Popen(["kolibri", "start", "--foreground"])
        else:
            logging.warning("Not starting Kolibri because its status is ({}): {}".format(
                status, cli.status.codes[status]
            ))
            self.__kolibri_process = None

        if self.__kolibri_process:
            self.__kolibri_exitcode = self.__kolibri_process.wait()
            self.__kolibri_process = None
