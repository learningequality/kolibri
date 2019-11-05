try:
    # Import in order to check if multiprocessing is supported on this platform
    from multiprocessing import synchronization  # noqa

    # Proxy Process to Thread to allow seamless substitution
    from multiprocessing import Process as Thread  # noqa
    from multiprocessing import Event  # noqa

    # any variable is local to a process, so this is
    # just a dummy
    local = object

    MULTIPROCESS = True
except ImportError:
    from threading import Thread  # noqa
    from threading import Event  # noqa
    from threading import local  # noqa

    MULTIPROCESS = False
