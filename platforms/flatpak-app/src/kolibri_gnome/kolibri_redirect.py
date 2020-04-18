#!/usr/bin/python3

# Displays a loading screen, and then redirects to Kolibri once it is
# responding. Stops automatically if it does not receive a request after a
# certain amount of time.

import http.server
import socketserver
import threading
import time

from urllib.parse import urlparse, parse_qs

from .utils import KOLIBRI_URL, get_is_kolibri_responding


WWW_DIR = '/app/www'

KOLIBRI_REDIRECT_IDLE_TIMEOUT_SECS = 60


class KolibriRedirectThread(threading.Thread):
    def __init__(self):
        self.__running = None

        kolibri_responding_event = threading.Event()
        self.__kolibri_poller_thread = KolibriPoller(kolibri_responding_event)

        self.__redirect_server = socketserver.TCPServer(("", 0), RedirectHandler)
        self.__redirect_server.kolibri_responding_event = kolibri_responding_event
        self.__redirect_server.last_heartbeat = time.time()

        self.__redirect_server_thread = threading.Thread(
            target=self.__redirect_server.serve_forever
        )

        sockname = self.__redirect_server.socket.getsockname()
        self.__redirect_server_port = sockname[1]

        self.__start_event = threading.Event()

        super().__init__()

    @property
    def redirect_server_port(self):
        return self.__redirect_server_port

    def get_idle_seconds(self):
        return time.time() - self.__redirect_server.last_heartbeat

    def await_started(self):
        self.__start_event.wait()
        time.sleep(1)

    def start(self):
        self.__running = True
        self.__kolibri_poller_thread.start()
        self.__redirect_server_thread.start()
        self.__start_event.set()
        super().start()

    def stop(self):
        self.__running = False
        self.join()
        self.__start_event.clear()

    def run(self):
        while self.__running:
            time.sleep(5)

            idle_seconds = self.get_idle_seconds()

            print("Redirect server: last heartbeat was {} seconds ago...".format(idle_seconds))

            if idle_seconds > KOLIBRI_REDIRECT_IDLE_TIMEOUT_SECS:
                print("Redirect server: Stopping...")
                self.__redirect_server.shutdown()
                self.__running = False


class KolibriPoller(threading.Thread):
    def __init__(self, kolibri_responding_event):
        self.__kolibri_responding_event = kolibri_responding_event
        super().__init__(daemon=True)

    def start(self):
        self.__running = True
        super().start()

    def stop(self):
        self.__running = False
        self.join()

    def run(self):
        while self.__running and not self.__kolibri_responding_event.is_set():
            if get_is_kolibri_responding():
                self.__kolibri_responding_event.set()

            # There is a corner case here where Kolibri may be running (lock
            # file is created), but responding at a different URL than we
            # expect. This is very unlikely, so we are ignoring it here.

            time.sleep(2)


class RedirectHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        kwargs['directory'] = WWW_DIR
        super().__init__(*args, **kwargs)

    def __get_kolibri_responding(self):
        return self.server.kolibri_responding_event.is_set()

    def __wait_kolibri_responding(self, timeout=None):
        return self.server.kolibri_responding_event.wait(timeout=timeout)

    def __do_heartbeat(self):
        self.server.last_heartbeat = time.time()

    def do_GET(self):
        url = urlparse(self.path)

        self.__do_heartbeat()

        if url.path == '/' and self.__get_kolibri_responding():
            next_path = parse_qs(url.query).get('next', [''])[0]
            return self.redirect_response(next_path)
        elif url.path == '/poll':
            is_kolibri_responding = self.__wait_kolibri_responding()
            return self.poll_response(is_kolibri_responding)
        else:
            return super().do_GET()

    def poll_response(self, is_kolibri_responding):
        self.send_response(200)

        if is_kolibri_responding:
            self.send_header("X-Kolibri-Ready", "1")
            self.send_header("X-Kolibri-Location", KOLIBRI_URL)
        else:
            self.send_header("X-Kolibri-Starting", "1")

        self.end_headers()

    def redirect_response(self, redirect_path):
        redirect_url = "{}{}".format(KOLIBRI_URL, redirect_path)
        self.send_response(302)
        self.send_header("Location", redirect_url)
        self.end_headers()
