#!/usr/bin/python3

# Starts Kolibri, recovering from improper exits if required.

import io
import os
import subprocess
import threading

from kolibri.utils import server
from kolibri.utils import cli

from .utils import KOLIBRI_URL, singleton_service


class KolibriServiceThread(threading.Thread):
    def __init__(self, heartbeat_port=None):
        kolibri_env = os.environ.copy()
        if heartbeat_port:
            kolibri_env['KOLIBRI_HEARTBEAT_PORT'] = str(heartbeat_port)
        self.__kolibri_env = kolibri_env
        self.__kolibri_exitcode = None
        super().__init__()

    @property
    def kolibri_exitcode(self):
        return self.__kolibri_exitcode

    def stop_kolibri(self):
        process = subprocess.Popen(["kolibri", "stop"])
        return process.wait()

    def run(self):
        try:
            with singleton_service('kolibri', KOLIBRI_URL):
                return self._run_kolibri_process()
        except io.BlockingIOError:
            print("Kolibri flatpak is already running; not starting server again.")
            return None

    def _run_kolibri_process(self):
        status = server.get_urls()[0]
        print("Kolibri status ({}): {}".format(status, cli.status.codes[status]))

        popen_args = {
            'env': self.__kolibri_env,
            'close_fds': False
        }

        if status in [server.STATUS_STOPPED, server.STATUS_FAILED_TO_START, server.STATUS_UNKNOWN]:
            print("Starting Kolibri...")
            process = subprocess.Popen(["kolibri", "start", "--foreground"], **popen_args)
        elif status in [server.STATUS_NOT_RESPONDING]:
            print("Restarting Kolibri...")
            process = subprocess.Popen(["kolibri", "restart"], **popen_args)
        elif status in [server.STATUS_UNCLEAN_SHUTDOWN, server.STATUS_FAILED_TO_START]:
            print("Clearing lock files and starting Kolibri...")
            if os.path.exists(server.STARTUP_LOCK):
                os.remove(server.STARTUP_LOCK)
            if os.path.exists(server.PID_FILE):
                os.remove(server.PID_FILE)
            process = subprocess.Popen(["kolibri", "start", "--foreground"], **popen_args)
        else:
            print("Warning: not starting Kolibri because its status is ({}): {}".format(
                status, cli.status.codes[status]
            ))
            process = None

        if process:
            self.__kolibri_exitcode = process.wait()
