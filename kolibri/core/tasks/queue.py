import atexit

from django.conf import settings
from iceqube.queue import Queue
from iceqube.worker import Worker

app = "kolibri"
connection = settings.QUEUE_JOB_STORAGE_CONNECTION


def initialize_worker():
    worker = Worker(app, connection=connection)
    atexit.register(worker.shutdown)


def get_queue():
    """

    :return: the Queue object
    """
    return Queue(app, connection=connection)
