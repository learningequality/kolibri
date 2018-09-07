import threading
import time

from django.db import transaction

LOG_SAVING_INTERVAL = 5

QUEUE_1 = []

QUEUE_2 = []

ACTIVE_QUEUE = QUEUE_1


def add_to_save_queue(fn):
    global ACTIVE_QUEUE
    ACTIVE_QUEUE.append(fn)


def toggle_active_queue():
    global ACTIVE_QUEUE
    if ACTIVE_QUEUE == QUEUE_1:
        ACTIVE_QUEUE = QUEUE_2
    else:
        ACTIVE_QUEUE = QUEUE_1


def clear_queue(queue):
    global QUEUE_1
    global QUEUE_2
    if queue == QUEUE_1:
        QUEUE_1 = []
    else:
        QUEUE_2 = []


class AsyncLogSavingThread(threading.Thread):

    @classmethod
    def start_command(cls):
        thread = cls()
        thread.daemon = True
        thread.start()

    def run(self):
        while True:
            queue = ACTIVE_QUEUE
            toggle_active_queue()
            with transaction.atomic():
                for fn in queue:
                    fn()
            clear_queue(queue)
            time.sleep(LOG_SAVING_INTERVAL)
