from contextlib import contextmanager


@contextmanager
def gapplication_hold(application):
    application.hold()
    try:
        yield
    finally:
        application.release()
