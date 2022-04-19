import multiprocessing
import threading
from concurrent import futures

from kolibri.utils.conf import OPTIONS


def use_multiprocessing():
    try:
        if not OPTIONS["Tasks"]["USE_WORKER_MULTIPROCESSING"]:
            raise ImportError()
        # Import in order to check if multiprocessing is supported on this platform
        from multiprocessing import synchronize  # noqa

        return True
    except ImportError:
        return False


def Thread(*args, **kwargs):
    if use_multiprocessing():
        return multiprocessing.Process(*args, **kwargs)
    return threading.Thread(*args, **kwargs)


def Event(*args, **kwargs):
    if use_multiprocessing():
        return multiprocessing.Event(*args, **kwargs)
    return threading.Event(*args, **kwargs)


class _Local(object):
    """
    Dummy class to use for a local object for multiprocessing
    """

    pass


def local(*args, **kwargs):
    if use_multiprocessing():
        # any variable is local to a process, so this is
        # just a dummy

        return _Local(*args, **kwargs)
    return threading.local(*args, **kwargs)


def PoolExecutor(*args, **kwargs):
    if use_multiprocessing():
        return futures.ProcessPoolExecutor(*args, **kwargs)
    return futures.ThreadPoolExecutor(*args, **kwargs)
