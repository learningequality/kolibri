import logging as logger
import threading
import time

from django.db import connections

logging = logger.getLogger(__name__)


class AsyncNotificationQueue:
    def __init__(self):
        # Value in seconds to determine the sleep time between log saving batches
        self.log_saving_interval = 5

        # Where new log saving functions are appended
        self.queue = []

        # Where the to be executed notifications calculating functions are stored
        # once a batch save has been invoked
        self.running = []

        # flag to decide if the async queue must be started
        self.started = False

        self._lock = threading.Lock()

    def append(self, fn):
        """
        Convenience method to append log saving function to the current queue
        """
        with self._lock:
            if not self.started:
                threading.Thread(target=self.start, daemon=True).start()
                self.started = True
            self.queue.append(fn)

    def toggle_queue(self):
        """
        Method to swap the queue and running, to allow new log saving functions
        to be added to the queue while previously added functions are being executed
        and cleared without fear of race conditions dropping saves.
        """
        with self._lock:
            self.queue, self.running = self.running, self.queue

    def clear_running(self):
        """
        Reset the running list to drop references to already executed log saving functions
        """
        self.running = []

    def run(self):
        """
        Execute any log saving functions in the self.running list
        """
        for fn in self.running:
            try:
                fn()
            except Exception as e:
                # Catch all exceptions and log, otherwise the background process will end
                # and no more logs will be saved!
                logging.warning(
                    "Exception raised during background notification calculation: %s",
                    e,
                )
        connections.close_all()

    def start(self):
        logging.info("Initializing background log saving process")
        while True:
            self.toggle_queue()
            self.run()
            self.clear_running()
            time.sleep(self.log_saving_interval)


log_queue = AsyncNotificationQueue()


def add_to_save_queue(fn):
    log_queue.append(fn)


def wrap_to_save_queue(fn, *args, **kwargs):
    def wrapper():
        fn(*args, **kwargs)

    log_queue.append(wrapper)
