import pytest


@pytest.mark.django_db
def test_importing_queue_no_open_connection():
    from kolibri.core.tasks.main import queue

    queue.empty()
