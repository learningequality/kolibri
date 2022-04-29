from contextlib import contextmanager

from kolibri.plugins.app.utils import interface


@contextmanager
def register_capabilities(**capabilities):
    interface.register(**capabilities)
    yield
    for capability in capabilities:
        del interface._capabilities[capability]
