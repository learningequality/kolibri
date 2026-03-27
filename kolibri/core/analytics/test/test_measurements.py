import unittest
from datetime import timedelta

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from kolibri.core.analytics import SUPPORTED_OS
from kolibri.core.analytics.measurements import get_db_info
from kolibri.core.auth.models import Session
from kolibri.core.auth.test.helpers import setup_device
from kolibri.core.logger.models import UserSessionLog


class GetDbInfoTestCase(TestCase):
    databases = "__all__"

    def test_active_sessions_count(self):
        now = timezone.now()
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
        Session.objects.create(
            session_key="expired1",
            session_data="data",
            expire_date=now - timedelta(hours=1),
        )

        active_sessions, _, _ = get_db_info()
        self.assertEqual(active_sessions, "2")

    def test_no_sessions_returns_zero(self):
        active_sessions, _, _ = get_db_info()
        self.assertEqual(active_sessions, "0")


class GetDbInfoUserCountsTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.facility, cls.superuser = setup_device()

    def test_active_users_in_last_ten_minutes(self):
        now = timezone.now()
        UserSessionLog.objects.create(
            user=self.superuser,
            start_timestamp=now - timedelta(minutes=5),
            last_interaction_timestamp=now - timedelta(minutes=2),
        )
        _, active_users, _ = get_db_info()
        self.assertEqual(active_users, "1")

    def test_active_users_in_last_minute(self):
        now = timezone.now()
        UserSessionLog.objects.create(
            user=self.superuser,
            start_timestamp=now - timedelta(seconds=30),
            last_interaction_timestamp=now - timedelta(seconds=10),
        )
        _, _, active_users_minute = get_db_info()
        self.assertEqual(active_users_minute, "1")

    def test_no_recent_users(self):
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

    @unittest.skipUnless(SUPPORTED_OS, "requires psutil support")
    def test_benchmark_command_smoke(self):
        call_command("benchmark")

    @unittest.skipIf(SUPPORTED_OS, "only runs on unsupported OS")
    def test_benchmark_command_unsupported_os(self):
        with self.assertRaises(SystemExit):
            call_command("benchmark")
