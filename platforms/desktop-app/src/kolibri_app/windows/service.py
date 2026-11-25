import os
import subprocess
import sys
import time
from contextlib import contextmanager
from threading import Event

import servicemanager
import win32api
import win32con
import win32job
import win32service
import win32serviceutil

from kolibri_app.constants import SERVICE_NAME
from kolibri_app.constants import STOP_WHEN_STDIN_CLOSES
from kolibri_app.logger import logging
from kolibri_app.windows.server_command import server_command_and_environment

SERVER_STOP_TIMEOUT = 30
SERVER_POLL_SECONDS = 1
RELAUNCH_THROTTLE_SECONDS = 30
STOP_PROGRESS_SECONDS = 1
STOP_PENDING_WAIT_HINT_MS = 5000


@contextmanager
def _kill_on_close_job():
    job = win32job.CreateJobObject(None, "")
    try:
        info = win32job.QueryInformationJobObject(
            job, win32job.JobObjectExtendedLimitInformation
        )
        info["BasicLimitInformation"]["LimitFlags"] = (
            win32job.JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        )
        win32job.SetInformationJobObject(
            job, win32job.JobObjectExtendedLimitInformation, info
        )
        yield job
    finally:
        win32api.CloseHandle(job)


def _launch_server(job):
    cmd, env = server_command_and_environment()
    cmd.append(STOP_WHEN_STDIN_CLOSES)
    logging.info(f"Launching server: {' '.join(cmd)}")
    server = subprocess.Popen(
        cmd,
        env=env,
        cwd=os.path.dirname(sys.executable),
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    process = win32api.OpenProcess(
        win32con.PROCESS_SET_QUOTA | win32con.PROCESS_TERMINATE, False, server.pid
    )
    try:
        win32job.AssignProcessToJobObject(job, process)
    finally:
        win32api.CloseHandle(process)
    return server


class KolibriService(win32serviceutil.ServiceFramework):
    _svc_name_ = SERVICE_NAME
    _svc_display_name_ = SERVICE_NAME

    def __init__(self, args):
        super().__init__(args)
        self.stop_requested = Event()

    def _report_stop_pending(self):
        self.ReportServiceStatus(
            win32service.SERVICE_STOP_PENDING, waitHint=STOP_PENDING_WAIT_HINT_MS
        )

    def _stop_server(self, server):
        server.stdin.close()
        deadline = time.monotonic() + SERVER_STOP_TIMEOUT
        while time.monotonic() < deadline:
            try:
                server.wait(timeout=STOP_PROGRESS_SECONDS)
                return
            except subprocess.TimeoutExpired:
                self._report_stop_pending()
        logging.warning("Server did not stop in time, terminating it.")

    def SvcStop(self):
        self._report_stop_pending()
        self.stop_requested.set()

    def SvcShutdown(self):
        self.SvcStop()

    def SvcDoRun(self):
        with _kill_on_close_job() as job:
            server = _launch_server(job)
            launched_at = time.monotonic()
            while not self.stop_requested.wait(SERVER_POLL_SECONDS):
                exit_code = server.poll()
                if exit_code is None:
                    continue
                logging.info(f"Server exited with code {exit_code}.")
                if time.monotonic() - launched_at < RELAUNCH_THROTTLE_SECONDS:
                    logging.warning(
                        f"Server exited soon after launch, waiting {RELAUNCH_THROTTLE_SECONDS}s to launch it again."
                    )
                    if self.stop_requested.wait(RELAUNCH_THROTTLE_SECONDS):
                        break
                server = _launch_server(job)
                launched_at = time.monotonic()
            self._stop_server(server)


def run_service():
    servicemanager.Initialize()
    servicemanager.PrepareToHostSingle(KolibriService)
    servicemanager.StartServiceCtrlDispatcher()
