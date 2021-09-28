import logging as logger
import threading
import time

from django.db import connection
from django.db import connections
from django.db import transaction
from django.db.utils import OperationalError

from kolibri.core.sqlite.utils import repair_sqlite_db
from kolibri.deployment.default.sqlite_db_names import NOTIFICATIONS

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

    def append(self, fn):
        """
        Convenience method to append log saving function to the current queue
        """
        if not self.started:
            AsyncNotificationsThread.start_command()
        self.queue.append(fn)

    def toggle_queue(self):
        """
        Method to swap the queue and running, to allow new log saving functions
        to be added to the queue while previously added functions are being executed
        and cleared without fear of race conditions dropping saves.
        """
        old_queue = self.queue
        new_queue = self.running
        self.queue = new_queue
        self.running = old_queue

    def clear_running(self):
        """
        Reset the running list to drop references to already executed log saving functions
        """
        self.running = []

    def run(self):
        """
        Execute any log saving functions in the self.running list
        """
        if self.running:
            # Do this conditionally to avoid opening an unnecessary transaction
            with transaction.atomic():
                for fn in self.running:
                    try:
                        fn()
                    except OperationalError:
                        repair_sqlite_db(connections[NOTIFICATIONS])
                    except Exception as e:
                        # Catch all exceptions and log, otherwise the background process will end
                        # and no more logs will be saved!
                        logging.warn(
                            "Exception raised during background notification calculation: %s",
                            e,
                        )
            connection.close()

    def start(self):
        self.started = True
        while True:
            self.toggle_queue()
            self.run()
            self.clear_running()
            time.sleep(self.log_saving_interval)


log_queue = AsyncNotificationQueue()


def add_to_save_queue(fn):
    log_queue.append(fn)


def wrap_to_save_queue(fn, *args):
    def wrapper():
        fn(*args)

    log_queue.append(wrapper)


class AsyncNotificationsThread(threading.Thread):
    @classmethod
    def start_command(cls):
        thread = cls()
        thread.daemon = True
        thread.start()

    def run(self):
        logging.info("Initializing background log saving process")
        log_queue.start()
