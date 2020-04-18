#!/usr/bin/python3

# An idle monitor for Kolibri. Stops Kolibri, and itself, if it does not
# receive a request after a certain amount of time.

import http.server
import socketserver
import threading
import time

from kolibri.utils.server import get_urls, STATUS_STARTING_UP

from .utils import KOLIBRI_IDLE_TIMEOUT_SECS, get_kolibri_running_tasks


class KolibriIdleMonitorThread(threading.Thread):
    def __init__(self):
        self.__running = None

        self.__kolibri_service = None

        self.__callback_server = socketserver.TCPServer(("", 0), CallbackHandler)
        self.__callback_server.last_heartbeat = time.time()

        self.__callback_server_thread = threading.Thread(
            target=self.__callback_server.serve_forever,
            daemon=True
        )

        sockname = self.__callback_server.socket.getsockname()
        self.__callback_server_port = sockname[1]

        super().__init__(daemon=True)

    @property
    def idle_monitor_port(self):
        return self.__callback_server_port

    def set_kolibri_service(self, kolibri_service):
        self.__kolibri_service = kolibri_service

    def get_idle_seconds(self):
        return time.time() - self.__callback_server.last_heartbeat

    def start(self):
        self.__running = True
        self.__callback_server_thread.start()
        super().start()

    def stop(self):
        self.__running = False
        self.join()

    def run(self):
        while self.__running:
            time.sleep(30)

            idle_seconds = self.get_idle_seconds()

            print("Last heartbeat was {} seconds ago...".format(idle_seconds))
            if idle_seconds > KOLIBRI_IDLE_TIMEOUT_SECS:
                # ensure there aren't any jobs still running; if so, refrain from shutting down for now
                job_count = get_kolibri_running_tasks()
                kolibri_status = get_urls()[0]
                print("Server is idle.")
                if job_count > 0:
                    print("Not stopping: there are {} jobs running.".format(
                        job_count
                    ))
                elif kolibri_status == STATUS_STARTING_UP:
                    print("Not stopping: Kolibri is starting up.")
                else:
                    print("Stopping...")
                    if self.__kolibri_service:
                        self.__kolibri_service.stop_kolibri()
                    self.__callback_server.shutdown()
                    self.__running = False


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.server.last_heartbeat = time.time()
        self.send_response(200)
