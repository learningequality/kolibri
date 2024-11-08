import pytest

from kolibri.utils import multiprocessing_compat


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

    monkeypatch.setattr(multiprocessing_compat, "Thread", Thread)
    monkeypatch.setattr(multiprocessing_compat, "Event", Event)
    monkeypatch.setattr(multiprocessing_compat, "local", local)
    monkeypatch.setattr(multiprocessing_compat, "PoolExecutor", PoolExecutor)
