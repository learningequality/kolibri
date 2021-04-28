"""
Tests for `kolibri.utils.server` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import pytest
import mock

from kolibri.core.tasks.scheduler import Scheduler
from kolibri.core.tasks.test.base import connection
from kolibri.utils import server


class TestServerInstallation(object):
    @mock.patch("sys.argv", ["kolibri-0.9.3.pex", "start"])
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
        with mock.patch("sys.argv", sys_args):
            install_type = server.installation_type()
            assert install_type == "devserver"

    @mock.patch("sys.argv", ["/usr/bin/kolibri", "start"])
    def test_dpkg(self):
        with mock.patch("kolibri.utils.server.check_output", return_value=""):
            install_type = server.installation_type()
            assert install_type == "dpkg"

    @mock.patch("sys.argv", ["/usr/bin/kolibri", "start"])
    def test_apt(apt):
        with mock.patch("kolibri.utils.server.check_output", return_value="any repo"):
            install_type = server.installation_type()
            assert install_type == "apt"

    @mock.patch("sys.argv", ["C:\\Python34\\Scripts\\kolibri", "start"])
    @mock.patch("sys.path", ["", "C:\\Program Files\\Kolibri\\kolibri.exe"])
    def test_windows(self):
        install_type = server.installation_type()
        assert install_type == "Windows"

    @mock.patch("sys.argv", ["/usr/local/bin/kolibri", "start"])
    def test_whl(self):
        install_type = server.installation_type()
        assert install_type == "whl"


@pytest.fixture
def scheduler():
    with connection() as c:
        s = Scheduler(connection=c)
        s.clear_scheduler()
        yield s
        s.clear_scheduler()


class TestServerServices(object):
    @mock.patch("kolibri.core.deviceadmin.utils.schedule_vacuum")
    @mock.patch("kolibri.core.analytics.utils.schedule_ping")
    @mock.patch("kolibri.utils.server.initialize_workers")
    @mock.patch("kolibri.core.discovery.utils.network.search.register_zeroconf_service")
    def test_required_services_initiate_on_start(
        self,
        register_zeroconf_service,
        initialize_workers,
        schedule_ping,
        schedule_vacuum,
        scheduler,
    ):
        server.scheduler = mock.MagicMock(name="server.scheduler", spec_set=scheduler)

        # Start server services
        services_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"), 1234)
        services_plugin.start()

        # Do we initialize workers when services start?
        initialize_workers.assert_called_once()

        # Do we start scheduler when services start?
        server.scheduler.start_scheduler.assert_called_once()

        # Do we register ourselves on zeroconf?
        register_zeroconf_service.assert_called_once_with(port=1234)

    @mock.patch("kolibri.utils.server.initialize_workers")
    @mock.patch(
        "kolibri.core.discovery.utils.network.search.unregister_zeroconf_service"
    )
    @mock.patch("kolibri.core.discovery.utils.network.search.register_zeroconf_service")
    def test_scheduled_jobs_persist_on_restart(
        self,
        register_zeroconf_service,
        unregister_zeroconf_service,
        initialize_workers,
        scheduler,
    ):
        # Replace calls to real scheduler with our test scheduler
        # in deviceadmin_utils, analytics_utils and server namespaces
        from kolibri.core.deviceadmin import utils as deviceadmin_utils
        from kolibri.core.analytics import utils as analytics_utils

        deviceadmin_utils.scheduler = mock.MagicMock(wraps=scheduler)
        analytics_utils.scheduler = mock.MagicMock(wraps=scheduler)
        server.scheduler = mock.MagicMock(wraps=scheduler)

        # Schedule two userdefined jobs
        from kolibri.utils.time_utils import local_now
        from datetime import timedelta

        schedule_time = local_now() + timedelta(hours=1)
        scheduler.schedule(schedule_time, id, job_id="test01")
        scheduler.schedule(schedule_time, id, job_id="test02")

        # Now, start services plugin
        service_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"), 1234)
        service_plugin.start()

        # Currently, we must have exactly four scheduled jobs
        # two userdefined and two server defined (pingback and vacuum)
        assert scheduler.count() == 4
        assert scheduler.get_job("test01") is not None
        assert scheduler.get_job("test02") is not None
        assert scheduler.get_job(server.SCH_PING_JOB_ID) is not None
        assert scheduler.get_job(server.SCH_VACUUM_JOB_ID) is not None

        # Restart services
        service_plugin.stop()
        service_plugin.start()

        # Make sure all scheduled jobs persist after restart
        assert scheduler.count() == 4
        assert scheduler.get_job("test01") is not None
        assert scheduler.get_job("test02") is not None
        assert scheduler.get_job(server.SCH_PING_JOB_ID) is not None
        assert scheduler.get_job(server.SCH_VACUUM_JOB_ID) is not None

    @mock.patch(
        "kolibri.core.discovery.utils.network.search.unregister_zeroconf_service"
    )
    def test_services_shutdown_on_stop(self, unregister_zeroconf_service, scheduler):
        server.scheduler = mock.MagicMock(name="server.scheduler", spec_set=scheduler)

        # Initialize and ready services plugin for testing
        services_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"), 1234)

        from kolibri.core.tasks.worker import Worker

        services_plugin.workers = [
            mock.MagicMock(name="worker", spec_set=Worker),
            mock.MagicMock(name="worker", spec_set=Worker),
            mock.MagicMock(name="worker", spec_set=Worker),
        ]

        # Now, let us stop services plugin
        services_plugin.stop()

        # Do we shutdown scheduler?
        server.scheduler.shutdown_scheduler.assert_called_once()

        # Do we shutdown workers correctly?
        for mock_worker in services_plugin.workers:
            assert mock_worker.shutdown.call_count == 2
            assert mock_worker.mock_calls == [
                mock.call.shutdown(),
                mock.call.shutdown(wait=True),
            ]

        # Do we unregister ourselves from zeroconf network?
        unregister_zeroconf_service.assert_called_once()
