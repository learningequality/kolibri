"""
Tests for `kolibri.utils.server` module.
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import os
from unittest import TestCase

import mock
import pytest

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
    @mock.patch("kolibri.core.tasks.main.initialize_workers")
    @mock.patch("kolibri.core.discovery.utils.network.search.register_zeroconf_service")
    def test_required_services_initiate_on_start(
        self,
        register_zeroconf_service,
        initialize_workers,
        schedule_ping,
        schedule_vacuum,
    ):
        with mock.patch("kolibri.core.tasks.main.scheduler") as scheduler:

            # Start server services
            services_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"))
            services_plugin.START()

            # Do we initialize workers when services start?
            initialize_workers.assert_called_once()

            # Do we start scheduler when services start?
            scheduler.start_scheduler.assert_called_once()

            register_zeroconf_service.assert_not_called()

    @mock.patch("kolibri.core.tasks.main.initialize_workers")
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
        with mock.patch("kolibri.core.tasks.main.scheduler", wraps=scheduler):

            # Don't start scheduler in real, otherwise we may end up in infinite thread loop
            scheduler.start_scheduler = mock.MagicMock(name="start_scheduler")

            # Schedule two userdefined jobs
            from kolibri.utils.time_utils import local_now
            from datetime import timedelta

            schedule_time = local_now() + timedelta(hours=1)
            scheduler.schedule(schedule_time, id, job_id="test01")
            scheduler.schedule(schedule_time, id, job_id="test02")

            # Now, start services plugin
            service_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"))
            service_plugin.START()

            # Currently, we must have exactly four scheduled jobs
            # two userdefined and two server defined (pingback and vacuum)
            from kolibri.core.analytics.utils import DEFAULT_PING_JOB_ID
            from kolibri.core.deviceadmin.utils import SCH_VACUUM_JOB_ID

            assert scheduler.count() == 4
            assert scheduler.get_job("test01") is not None
            assert scheduler.get_job("test02") is not None
            assert scheduler.get_job(DEFAULT_PING_JOB_ID) is not None
            assert scheduler.get_job(SCH_VACUUM_JOB_ID) is not None

            # Restart services
            service_plugin.STOP()
            service_plugin.START()

            # Make sure all scheduled jobs persist after restart
            assert scheduler.count() == 4
            assert scheduler.get_job("test01") is not None
            assert scheduler.get_job("test02") is not None
            assert scheduler.get_job(DEFAULT_PING_JOB_ID) is not None
            assert scheduler.get_job(SCH_VACUUM_JOB_ID) is not None

    def test_services_shutdown_on_stop(self):
        with mock.patch("kolibri.core.tasks.main.scheduler") as scheduler:

            # Initialize and ready services plugin for testing
            services_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"))

            from kolibri.core.tasks.worker import Worker

            services_plugin.workers = [
                mock.MagicMock(name="worker", spec_set=Worker),
                mock.MagicMock(name="worker", spec_set=Worker),
                mock.MagicMock(name="worker", spec_set=Worker),
            ]

            # Now, let us stop services plugin
            services_plugin.STOP()

            # Do we shutdown scheduler?
            scheduler.shutdown_scheduler.assert_called_once()

            # Do we shutdown workers correctly?
            for mock_worker in services_plugin.workers:
                assert mock_worker.shutdown.call_count == 1
                assert mock_worker.mock_calls == [
                    mock.call.shutdown(wait=True),
                ]


class TestZeroConfPlugin(object):
    @mock.patch("kolibri.core.discovery.utils.network.search.register_zeroconf_service")
    @mock.patch(
        "kolibri.core.discovery.utils.network.search.reinitialize_zeroconf_if_network_has_changed"
    )
    def test_required_services_initiate_on_start(
        self,
        reinitialize_zeroconf_if_network_has_changed,
        register_zeroconf_service,
    ):

        # Start zeroconf services
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 1234)
        zeroconf_plugin.START()

        register_zeroconf_service.assert_not_called()

        reinitialize_zeroconf_if_network_has_changed.assert_not_called()

        zeroconf_plugin.SERVING(1234)

        # Do we register ourselves on zeroconf?
        register_zeroconf_service.assert_called_once_with(port=1234)

        zeroconf_plugin.STOP()

    @mock.patch(
        "kolibri.core.discovery.utils.network.search.unregister_zeroconf_service"
    )
    def test_services_shutdown_on_stop(self, unregister_zeroconf_service):
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 1234)
        # Now, let us stop services plugin
        zeroconf_plugin.STOP()

        # Do we unregister ourselves from zeroconf network?
        unregister_zeroconf_service.assert_called_once()


class ServerInitializationTestCase(TestCase):
    @mock.patch("kolibri.utils.server.logging.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_occupied(self, wait_for_port_mock, logging_mock):
        wait_for_port_mock.side_effect = OSError
        with self.assertRaises(SystemExit):
            server.background_port_check("8080", "8081")
            logging_mock.assert_called()

    @mock.patch("kolibri.utils.server.logging.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_occupied_socket_activation(self, wait_for_port_mock, logging_mock):
        wait_for_port_mock.side_effect = OSError
        # LISTEN_PID environment variable would be set if using socket activation
        with mock.patch.dict(os.environ, {"LISTEN_PID": "1234"}):
            server.background_port_check("8080", "8081")
            logging_mock.assert_not_called()

    @mock.patch("kolibri.utils.server.logging.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_zero_zip_port_zero(self, wait_for_port_mock, logging_mock):
        wait_for_port_mock.side_effect = OSError
        server.background_port_check("0", "0")
        logging_mock.assert_not_called()

    @mock.patch("kolibri.utils.server.pid_exists")
    @mock.patch("kolibri.utils.server.ProcessBus")
    def test_unclean_shutdown(self, process_bus_mock, pid_exists_mock):
        pid_exists_mock.return_value = False
        with open(server.PID_FILE, "w") as f:
            f.write("{}\n{}\n{}\n{}\n".format(1000, 8000, 8001, server.STATUS_RUNNING))
        server.start()
        process_bus_mock.assert_called()

    @mock.patch("kolibri.utils.server.pid_exists")
    @mock.patch("kolibri.utils.server.ProcessBus")
    def test_server_running(self, process_bus_mock, pid_exists_mock):
        pid_exists_mock.return_value = True
        with open(server.PID_FILE, "w") as f:
            f.write("{}\n{}\n{}\n{}\n".format(1000, 8000, 8001, server.STATUS_RUNNING))
        with self.assertRaises(SystemExit):
            server.start()


class ServerSignalHandlerTestCase(TestCase):
    @mock.patch("kolibri.utils.server.os.getpid")
    @mock.patch("kolibri.utils.server.BaseSignalHandler._handle_signal")
    def test_signal_different_pid(self, handle_signal_mock, getpid_mock):
        getpid_mock.return_value = 1235
        signal_handler = server.SignalHandler(mock.MagicMock())
        signal_handler.process_pid = 1234
        signal_handler._handle_signal()
        handle_signal_mock.assert_not_called()

    @mock.patch("kolibri.utils.server.os.getpid")
    @mock.patch("kolibri.utils.server.BaseSignalHandler._handle_signal")
    def test_signal_same_pid(self, handle_signal_mock, getpid_mock):
        pid = 1234
        getpid_mock.return_value = pid
        signal_handler = server.SignalHandler(mock.MagicMock())
        signal_handler.process_pid = pid
        signal_handler._handle_signal()
        handle_signal_mock.assert_called()

    def test_signal_subscribe(self):
        bus_mock = mock.MagicMock()
        signal_handler = server.SignalHandler(bus_mock)
        signal_handler.subscribe()
        bus_mock.subscribe.assert_called_with("ENTER", signal_handler.ENTER)
