from datetime import timedelta

import mock
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from kolibri.core.analytics.measurements import get_db_info
from kolibri.core.auth.models import Session
from kolibri.core.auth.test.helpers import setup_device
from kolibri.core.logger.models import UserSessionLog


class GetDbInfoTestCase(TestCase):
    databases = "__all__"

    def test_active_sessions_count(self):
        """get_db_info returns the count of non-expired sessions."""
        now = timezone.now()
        # Create 2 sessions that have not expired
        Session.objects.create(
            session_key="active1",
            session_data="data",
            expire_date=now + timedelta(hours=1),
        )
        Session.objects.create(
            session_key="active2",
            session_data="data",
            expire_date=now + timedelta(hours=2),
        )
        # Create 1 expired session
        Session.objects.create(
            session_key="expired1",
            session_data="data",
            expire_date=now - timedelta(hours=1),
        )

        active_sessions, _, _ = get_db_info()
        self.assertEqual(active_sessions, "2")

    def test_no_sessions_returns_zero(self):
        """get_db_info returns '0' when no sessions exist."""
        active_sessions, _, _ = get_db_info()
        self.assertEqual(active_sessions, "0")


class GetDbInfoUserCountsTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.facility, cls.superuser = setup_device()

    def test_active_users_in_last_ten_minutes(self):
        """get_db_info counts users with interaction in last 10 minutes."""
        now = timezone.now()
        UserSessionLog.objects.create(
            user=self.superuser,
            start_timestamp=now - timedelta(minutes=5),
            last_interaction_timestamp=now - timedelta(minutes=2),
        )
        _, active_users, _ = get_db_info()
        self.assertEqual(active_users, "1")

    def test_active_users_in_last_minute(self):
        """get_db_info counts users with interaction in last 1 minute."""
        now = timezone.now()
        UserSessionLog.objects.create(
            user=self.superuser,
            start_timestamp=now - timedelta(seconds=30),
            last_interaction_timestamp=now - timedelta(seconds=10),
        )
        _, _, active_users_minute = get_db_info()
        self.assertEqual(active_users_minute, "1")

    def test_no_recent_users(self):
        """get_db_info returns '0' when no recent user activity."""
        now = timezone.now()
        UserSessionLog.objects.create(
            user=self.superuser,
            start_timestamp=now - timedelta(hours=1),
            last_interaction_timestamp=now - timedelta(minutes=30),
        )
        _, active_users, active_users_minute = get_db_info()
        self.assertEqual(active_users, "0")
        self.assertEqual(active_users_minute, "0")


class BenchmarkCommandTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        setup_device()

    @mock.patch("kolibri.core.analytics.management.commands.benchmark.get_kolibri_use", return_value=("0", "0"))
    @mock.patch("kolibri.core.analytics.management.commands.benchmark.get_requests_info", return_value=("0.01 s", "0.01 s", "0.01 s"))
    @mock.patch("kolibri.core.analytics.management.commands.benchmark.get_machine_info", return_value=("0", "0", "0", "0"))
    @mock.patch("kolibri.core.analytics.management.commands.benchmark.get_kolibri_process_cmd", return_value=["kolibri", "start"])
    @mock.patch("kolibri.core.analytics.management.commands.benchmark.installation_type", return_value="Unknown")
    @mock.patch("kolibri.core.analytics.management.commands.benchmark.SUPPORTED_OS", True)
    def test_benchmark_command_runs_without_error(self, *_args):
        """The benchmark management command completes without raising."""
        call_command("benchmark")
