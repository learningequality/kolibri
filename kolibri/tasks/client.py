import atexit

from django.conf import settings
from iceqube.client import SimpleClient

_client = None


def get_client():
    """

    :return: the SimpleClient object
    """

    global _client
    if not _client:
        # not initialized, initialize it
        _client = SimpleClient(app="kolibri", storage_path=settings.QUEUE_JOB_STORAGE_PATH)
        atexit.register(_client.shutdown)

    return _client
