import atexit

from django.conf import settings
from iceqube.queue import Queue
from iceqube.worker import Worker

_queue = None

app = "kolibri"
storage_path = settings.QUEUE_JOB_STORAGE_PATH


def initialize_worker():
    worker = Worker(app, storage_path=storage_path)
    atexit.register(worker.shutdown)


def get_queue():
    """

    :return: the Queue object
    """

    global _queue
    if not _queue:
        # not initialized, initialize it
        _queue = Queue(app, storage_path=storage_path)

    return _queue
