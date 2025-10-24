import logging

from django.utils.functional import SimpleLazyObject

from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.worker import Worker
from kolibri.utils import conf


logger = logging.getLogger(__name__)


def __job_storage():
    return Storage()


# This storage instance should be used to access job_storage db.
job_storage = SimpleLazyObject(__job_storage)
""" :type: Storage """


def initialize_workers(log_queue=None):
    logger.info("Starting async task workers.")
    return Worker(
        regular_workers=conf.OPTIONS["Tasks"]["REGULAR_PRIORITY_WORKERS"],
        high_workers=conf.OPTIONS["Tasks"]["HIGH_PRIORITY_WORKERS"],
        log_queue=log_queue,
    )
