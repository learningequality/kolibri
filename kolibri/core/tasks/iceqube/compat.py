try:
    # Import in order to check if multiprocessing is supported on this platform
    from multiprocessing import synchronization  # noqa

    # Proxy Process to Thread to allow seamless substitution
    from multiprocessing import Process as Thread  # noqa
    from multiprocessing import Event  # noqa

    MULTIPROCESS = True
except ImportError:
    from threading import Thread, Event  # noqa

    MULTIPROCESS = False
