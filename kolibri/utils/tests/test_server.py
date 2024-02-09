"""
Tests for `kolibri.utils.server` module.
"""
import os
from unittest import TestCase

import mock
import pytest

from kolibri.core.tasks.job import Job
from kolibri.core.tasks.storage import Storage
from kolibri.core.tasks.test.base import connection
from kolibri.utils import server
from kolibri.utils.constants import installation_types


class TestServerInstallation(object):
    @mock.patch("sys.argv", ["kolibri-0.9.3.pex", "start"])
    def test_pex(self):
        install_type = server.installation_type()
        assert install_type == installation_types.PEX

    def test_dev(self):
        with mock.patch("os.environ", {"KOLIBRI_DEVELOPER_MODE": "True"}):
            install_type = server.installation_type()
            assert install_type == "devserver"

    @mock.patch("sys.argv", ["/usr/bin/kolibri", "start"])
    @mock.patch("os.environ", {"KOLIBRI_INSTALLER_VERSION": "1.0"})
    def test_dpkg(self):
        with mock.patch("kolibri.utils.server.check_output", return_value=""):
            install_type = server.installation_type()
            assert install_type == installation_types.install_type_map[
                installation_types.DEB
            ].format("1.0")

    @mock.patch("sys.argv", ["/usr/bin/kolibri", "start"])
    def test_dpkg_version(self):
        DPKG_OUTPUT = """
        Package: kolibri
        Status: install ok installed
        Priority: optional
        Section: education
        Architecture: all
        Source: kolibri-source
        Version: 0.15.0~beta2-0ubuntu1
        Depends: python3 (>= 3.4), python3-pkg-resources, adduser
        Recommends: python3-cryptography (>= 1.2.3)
        """
        with mock.patch("kolibri.utils.server.check_output", return_value=DPKG_OUTPUT):
            install_type = server.installation_type()
            assert install_type == installation_types.install_type_map[
                installation_types.DEB
            ].format("0.15.0~beta2-0ubuntu1")

    @mock.patch("sys.argv", ["/usr/bin/kolibri", "start"])
    @mock.patch("os.environ", {"KOLIBRI_INSTALLER_VERSION": "1.0"})
    def test_apt(apt):
        with mock.patch("kolibri.utils.server.check_output", return_value="any repo"):
            install_type = server.installation_type()
            assert install_type == installation_types.install_type_map[
                installation_types.DEB
            ].format("1.0")

    @mock.patch("sys.argv", ["C:\\Python34\\Scripts\\kolibri", "start"])
    @mock.patch("sys.path", ["", "C:\\Program Files\\Kolibri\\kolibri.exe"])
    @mock.patch("os.environ", {"KOLIBRI_INSTALLER_VERSION": "1.0"})
    def test_windows(self):
        install_type = server.installation_type()
        assert install_type == installation_types.install_type_map[
            installation_types.WINDOWS
        ].format("1.0")

    @mock.patch("sys.argv", ["/usr/local/bin/kolibri", "start"])
    def test_whl(self):
        install_type = server.installation_type()
        assert (
            install_type == installation_types.install_type_map[installation_types.WHL]
        )


@pytest.fixture
def job_storage():
    with connection() as c:
        s = Storage(connection=c)
        s.clear()
        yield s
        s.clear()


class TestServerServices(object):
    @mock.patch("kolibri.core.deviceadmin.tasks.schedule_vacuum")
    @mock.patch("kolibri.core.analytics.tasks.schedule_ping")
    @mock.patch("kolibri.core.tasks.main.initialize_workers")
    @mock.patch("kolibri.core.discovery.utils.network.broadcast.KolibriBroadcast")
    def test_required_services_initiate_on_start(
        self,
        mock_kolibri_broadcast,
        initialize_workers,
        schedule_ping,
        schedule_vacuum,
    ):
        # Start server services
        services_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"))
        services_plugin.START()

        # Do we initialize workers when services start?
        initialize_workers.assert_called_once()

        mock_kolibri_broadcast.assert_not_called()

    def test_services_shutdown_on_stop(self):

        # Initialize and ready services plugin for testing
        services_plugin = server.ServicesPlugin(mock.MagicMock(name="bus"))

        from kolibri.core.tasks.worker import Worker

        services_plugin.worker = mock.MagicMock(name="worker", spec_set=Worker)

        # Now, let us stop services plugin
        services_plugin.STOP()

        # Do we shutdown workers correctly?
        assert services_plugin.worker.shutdown.call_count == 1
        assert services_plugin.worker.mock_calls == [
            mock.call.shutdown(wait=True),
        ]


class TestServerDefaultScheduledTasks(object):
    @mock.patch("kolibri.core.discovery.utils.network.broadcast.KolibriBroadcast")
    def test_scheduled_jobs_persist_on_restart(
        self,
        mock_kolibri_broadcast,
        job_storage,
    ):
        with mock.patch("kolibri.core.tasks.registry.job_storage", wraps=job_storage):

            # Schedule two userdefined jobs
            from kolibri.utils.time_utils import local_now
            from datetime import timedelta

            schedule_time = local_now() + timedelta(hours=1)
            test1 = job_storage.schedule(schedule_time, Job(id))
            test2 = job_storage.schedule(schedule_time, Job(id))

            # Now, start services plugin
            default_scheduled_tasks_plugin = server.DefaultScheduledTasksPlugin(
                mock.MagicMock(name="bus")
            )
            default_scheduled_tasks_plugin.START()

            # Currently, we must have exactly four scheduled jobs
            # two userdefined and two server defined (pingback and vacuum)
            from kolibri.core.analytics.tasks import DEFAULT_PING_JOB_ID
            from kolibri.core.deviceadmin.tasks import SCH_VACUUM_JOB_ID
            from kolibri.core.deviceadmin.tasks import STREAMED_CACHE_CLEANUP_JOB_ID

            assert len(job_storage) == 5
            assert job_storage.get_job(test1) is not None
            assert job_storage.get_job(test2) is not None
            assert job_storage.get_job(DEFAULT_PING_JOB_ID) is not None
            assert job_storage.get_job(SCH_VACUUM_JOB_ID) is not None
            assert job_storage.get_job(STREAMED_CACHE_CLEANUP_JOB_ID) is not None

            # Restart services
            default_scheduled_tasks_plugin.START()

            # Make sure all scheduled jobs persist after restart
            assert len(job_storage) == 5
            assert job_storage.get_job(test1) is not None
            assert job_storage.get_job(test2) is not None
            assert job_storage.get_job(DEFAULT_PING_JOB_ID) is not None
            assert job_storage.get_job(SCH_VACUUM_JOB_ID) is not None
            assert job_storage.get_job(STREAMED_CACHE_CLEANUP_JOB_ID) is not None


class TestZeroConfPlugin(object):
    @mock.patch("kolibri.core.discovery.utils.network.search.NetworkLocationListener")
    @mock.patch(
        "kolibri.core.discovery.utils.network.broadcast.build_broadcast_instance"
    )
    @mock.patch("kolibri.core.discovery.utils.network.broadcast.KolibriBroadcast")
    def test_required_services_initiate_on_start(
        self, mock_kolibri_broadcast, mock_build_instance, *args
    ):

        # Start zeroconf services
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 1234)
        zeroconf_plugin.START()

        mock_kolibri_broadcast.assert_not_called()

        zeroconf_plugin.SERVING(1234)
        zeroconf_plugin.RUN()

        # Do we register ourselves on zeroconf?
        mock_kolibri_broadcast.assert_called()
        mock_kolibri_broadcast().start_broadcast.assert_called_once_with()
        mock_build_instance.assert_called_once_with(1234)

        zeroconf_plugin.STOP()

    @mock.patch("kolibri.core.discovery.utils.network.broadcast.KolibriBroadcast")
    def test_services_shutdown_on_stop(self, mock_kolibri_broadcast):
        zeroconf_plugin = server.ZeroConfPlugin(mock.MagicMock(name="bus"), 1234)
        broadcast = mock_kolibri_broadcast()
        zeroconf_plugin.broadcast = broadcast
        # Now, let us stop services plugin
        zeroconf_plugin.STOP()

        # Do we unregister ourselves from zeroconf network?
        broadcast.stop_broadcast.assert_called_once()


@mock.patch(
    "kolibri.utils.server._read_pid_file", return_value=((None, None, None, None))
)
class ServerInitializationTestCase(TestCase):
    @mock.patch("kolibri.utils.server.logger.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_occupied(self, wait_for_port_mock, logging_mock, read_pid_file_mock):
        wait_for_port_mock.side_effect = OSError
        with self.assertRaises(server.PortOccupied):
            server._port_check("8080")
        logging_mock.assert_called()

    @mock.patch("kolibri.utils.server.logger.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_occupied_socket_activation(
        self, wait_for_port_mock, logging_mock, read_pid_file_mock
    ):
        wait_for_port_mock.side_effect = OSError
        # LISTEN_PID environment variable would be set if using socket activation
        with mock.patch.dict(os.environ, {"LISTEN_PID": "1234"}):
            server._port_check("8080")
            logging_mock.assert_not_called()

    @mock.patch("kolibri.utils.server.logger.error")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_port_zero_zip_port_zero(
        self, wait_for_port_mock, logging_mock, read_pid_file_mock
    ):
        wait_for_port_mock.side_effect = OSError
        server._port_check(0)
        logging_mock.assert_not_called()

    @mock.patch("kolibri.utils.server.pid_exists")
    def test_unclean_shutdown(self, pid_exists_mock, read_pid_file_mock):
        pid_exists_mock.return_value = False
        read_pid_file_mock.return_value = (1000, 8000, 8001, server.STATUS_RUNNING)
        with mock.patch.object(server.KolibriProcessBus, "run") as run_mock:
            server.start()
            run_mock.assert_called()

    @mock.patch("kolibri.utils.server.pid_exists")
    @mock.patch("kolibri.utils.server.wait_for_free_port")
    def test_server_running(
        self, wait_for_port_mock, pid_exists_mock, read_pid_file_mock
    ):
        wait_for_port_mock.side_effect = OSError
        pid_exists_mock.return_value = True
        read_pid_file_mock.return_value = (1000, 8000, 8001, server.STATUS_RUNNING)
        with self.assertRaises(server.PortOccupied):
            server.start(port=8000)


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
