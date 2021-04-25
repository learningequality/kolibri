"""
Tests for `kolibri.utils.server` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import os
import tempfile

import pytest
from mock import patch
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.queue import Queue
from kolibri.core.tasks.scheduler import Scheduler
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.worker import Worker
from kolibri.utils import server


class TestServerInstallation(object):
    @patch("sys.argv", ["kolibri-0.9.3.pex", "start"])
    def test_pex(self):
        install_type = server.installation_type()
        assert install_type == "pex"

    def test_dev(self):
        sys_args = [
            "kolibri",
            "--debug",
            "manage",
            "runserver",
            "--settings=kolibri.deployment.default.settings.dev",
            '"0.0.0.0:8000"',
        ]
        with patch("sys.argv", sys_args):
            install_type = server.installation_type()
            assert install_type == "devserver"

    @patch("sys.argv", ["/usr/bin/kolibri", "start"])
    def test_dpkg(self):
        with patch("kolibri.utils.server.check_output", return_value=""):
            install_type = server.installation_type()
            assert install_type == "dpkg"

    @patch("sys.argv", ["/usr/bin/kolibri", "start"])
    def test_apt(apt):
        with patch("kolibri.utils.server.check_output", return_value="any repo"):
            install_type = server.installation_type()
            assert install_type == "apt"

    @patch("sys.argv", ["C:\\Python34\\Scripts\\kolibri", "start"])
    @patch("sys.path", ["", "C:\\Program Files\\Kolibri\\kolibri.exe"])
    def test_windows(self):
        install_type = server.installation_type()
        assert install_type == "Windows"

    @patch("sys.argv", ["/usr/local/bin/kolibri", "start"])
    def test_whl(self):
        install_type = server.installation_type()
        assert install_type == "whl"


@pytest.fixture
def dbconnection():
    fd, filepath = tempfile.mkstemp()
    connection = create_engine(
        "sqlite:///{path}".format(path=filepath),
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
    )
    yield connection
    os.close(fd)
    os.remove(filepath)


@pytest.fixture
def storage(dbconnection):
    s = Storage(dbconnection)
    yield s
    s.clear()


QUEUE = "pytest"


class MockServices(object):
    """
    Mocks the kolibri services plugin.
    """

    def __init__(self, connection):
        self.workers = None
        self.scheduler = None
        self.connection = connection

    def start(self):
        # Initialize workers
        self.workers = [Worker(QUEUE, connection=self.connection)]

        # Start the scheduler
        q = Queue(queue=QUEUE, connection=self.connection)
        self.scheduler = Scheduler(queue=q)
        self.scheduler.start_scheduler()

    def stop(self):
        # Shutdowns scheduler
        if self.scheduler is not None:
            self.scheduler.shutdown_scheduler()

        # Shutdowns the workers
        if self.workers is not None:
            for worker in self.workers:
                worker.shutdown()


def test_nonscheduled_jobs_persist_on_server_restart(dbconnection, storage):
    # Start server services
    mock_services = MockServices(dbconnection)
    mock_services.start()

    # Enqueue three jobs
    job = Job(id)
    storage.enqueue_job(job, QUEUE)
    job = Job(id)
    storage.enqueue_job(job, QUEUE)
    job = Job(id)
    storage.enqueue_job(job, QUEUE)

    # Did we enqueue all three jobs correctly?
    assert storage.count_all_jobs(QUEUE) == 3

    # Ok, let us stop the services
    mock_services.stop()

    # Do jobs persist on db?
    assert storage.count_all_jobs(QUEUE) == 3

    # Start services again
    mock_services.start()

    # Do jobs still persist?
    assert storage.count_all_jobs(QUEUE) == 3

    # Finally, stop the services
    mock_services.stop()


def test_scheduled_jobs_persist_on_server_restart(dbconnection):
    # Start server services
    mock_services = MockServices(dbconnection)
    mock_services.start()

    # Enqueue three scheduled jobs
    from kolibri.utils.time_utils import local_now
    from datetime import timedelta

    schedule_time = local_now() + timedelta(hours=1)
    mock_services.scheduler.schedule(schedule_time, id)
    mock_services.scheduler.schedule(schedule_time, id)
    mock_services.scheduler.schedule(schedule_time, id)

    # Did we enqueue all three scheduled jobs?
    assert mock_services.scheduler.count() == 3

    # Ok, let us stop the services
    mock_services.stop()

    # Do scheduled jobs persist on db?
    assert mock_services.scheduler.count() == 3

    # Start services again
    mock_services.start()

    # Do scheduled jobs still persist?
    assert mock_services.scheduler.count() == 3

    # Finally, stop the services
    mock_services.stop()
