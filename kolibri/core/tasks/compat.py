from kolibri.utils.conf import OPTIONS

try:
    if not OPTIONS["Tasks"]["USE_WORKER_MULTIPROCESSING"]:
        raise ImportError()
    # Import in order to check if multiprocessing is supported on this platform
    from multiprocessing import synchronize  # noqa

    # Proxy Process to Thread to allow seamless substitution
    from multiprocessing import Process as Thread  # noqa
    from multiprocessing import Event  # noqa

    # any variable is local to a process, so this is
    # just a dummy
    class local(object):
        """
        Dummy class to use for a local object for multiprocessing
        """

        pass

    from concurrent.futures import ProcessPoolExecutor as PoolExecutor  # noqa

except ImportError:
    from threading import Thread  # noqa
    from threading import Event  # noqa
    from threading import local  # noqa
    from concurrent.futures import ThreadPoolExecutor as PoolExecutor  # noqa
