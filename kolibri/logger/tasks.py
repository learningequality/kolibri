import threading
import time

from django.db import transaction

class AsyncLogQueue():

    def __init__(self):

        self.log_saving_interval = 5

        self.active_queue = []

        self.inactive_queue = []

    def append(self, fn):
        self.active_queue.append(fn)

    def toggle_active_queue(self):
        old_active_queue = self.active_queue
        new_active_queue = self.inactive_queue
        self.active_queue = new_active_queue
        self.inactive_queue = old_active_queue

    def clear_queue(self):
        self.inactive_queue = []

    def run_queue(self):
        if self.inactive_queue:
            # Do this conditionally to avoid opening an unnecessary transaction
            with transaction.atomic():
                for fn in self.inactive_queue:
                    fn()

    def start_queue(self):
        while True:
            self.toggle_active_queue()
            self.run_queue()
            self.clear_queue()
            time.sleep(self.log_saving_interval)


log_queue = AsyncLogQueue()


def add_to_save_queue(fn):
    log_queue.append(fn)


class AsyncLogSavingThread(threading.Thread):

    @classmethod
    def start_command(cls):
        thread = cls()
        thread.daemon = True
        thread.start()

    def run(self):
        log_queue.start_queue()
