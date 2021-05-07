import pytest

from kolibri.core.tasks import compat


@pytest.fixture(params=[False, True], autouse=True)
def mock_compat(request, monkeypatch):

    if request.param:
        from multiprocessing import Process as Thread  # noqa
        from multiprocessing import Event  # noqa
        from concurrent.futures import ProcessPoolExecutor as PoolExecutor  # noqa

        class local(object):
            """
            Dummy class to use for a local object for multiprocessing
            """

            pass

    else:
        from threading import Thread  # noqa
        from threading import Event  # noqa
        from threading import local  # noqa
        from concurrent.futures import ThreadPoolExecutor as PoolExecutor  # noqa

    monkeypatch.setattr(compat, "Thread", Thread)
    monkeypatch.setattr(compat, "Event", Event)
    monkeypatch.setattr(compat, "local", local)
    monkeypatch.setattr(compat, "PoolExecutor", PoolExecutor)
