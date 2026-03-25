from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from kolibri.core.analytics.measurements import get_db_info
from kolibri.core.auth.models import Session


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

        active_sessions, active_users, active_users_minute = get_db_info()
        self.assertEqual(active_sessions, "2")

    def test_no_sessions_returns_zero(self):
        """get_db_info returns '0' when no sessions exist."""
        active_sessions, _, _ = get_db_info()
        self.assertEqual(active_sessions, "0")
