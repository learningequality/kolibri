from datetime import timedelta
from unittest import mock

from django.test import TestCase
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import job_storage
from kolibri.core.tasks.worker import execute_job
from kolibri.utils.time_utils import local_now

from ..local_notifications import create_impact_stories_notification_if_needed
from ..local_notifications import IMPACT_STORIES_KEY
from ..models import LocalNotification
from ..tasks import _generate_local_notifications
from ..tasks import COOLDOWN_DAYS
from ..tasks import LOCAL_NOTIFICATION_JOB_ID


def _create_sessions(user, count, days_ago=0):
    now = local_now()
    for _ in range(count):
        ContentSessionLog.objects.create(
            user=user,
            content_id="00000000000000000000000000000000",
            channel_id="00000000000000000000000000000000",
            start_timestamp=now - timedelta(days=days_ago),
            kind="video",
        )


class LocalNotificationAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = FacilityUserFactory.create(facility=cls.facility)
        cls.superuser.set_password(DUMMY_PASSWORD)
        cls.superuser.save()
        DevicePermissions.objects.create(user=cls.superuser, is_superuser=True)
        cls.regular_user = FacilityUserFactory.create(facility=cls.facility)
        cls.regular_user.set_password(DUMMY_PASSWORD)
        cls.regular_user.save()

    def _login_superuser(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _login_regular_user(self):
        self.client.login(
            username=self.regular_user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_list_returns_rows_for_superuser(self):
        LocalNotification.objects.create(key=IMPACT_STORIES_KEY)
        self._login_superuser()
        response = self.client.get(reverse("kolibri:core:localnotification-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        row = response.data[0]
        self.assertEqual(row["key"], IMPACT_STORIES_KEY)
        # Render context attached so the recipient can recognise the deployment.
        self.assertEqual(row["facility_name"], self.facility.name)
        # learner_count: regular_user counts as a learner; superuser does not.
        self.assertEqual(row["learner_count"], 1)

    def test_list_denied_for_non_superuser(self):
        LocalNotification.objects.create(key=IMPACT_STORIES_KEY)
        self._login_regular_user()
        response = self.client.get(reverse("kolibri:core:localnotification-list"))
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED),
        )

    def test_destroy_deletes_row(self):
        notif = LocalNotification.objects.create(key=IMPACT_STORIES_KEY)
        self._login_superuser()
        detail_url = reverse(
            "kolibri:core:localnotification-detail", kwargs={"pk": notif.pk}
        )
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(LocalNotification.objects.filter(pk=notif.pk).exists())

    def test_destroy_denied_for_non_superuser(self):
        notif = LocalNotification.objects.create(key=IMPACT_STORIES_KEY)
        self._login_regular_user()
        detail_url = reverse(
            "kolibri:core:localnotification-detail", kwargs={"pk": notif.pk}
        )
        response = self.client.delete(detail_url)
        self.assertIn(
            response.status_code,
            (status.HTTP_403_FORBIDDEN, status.HTTP_401_UNAUTHORIZED),
        )
        self.assertTrue(LocalNotification.objects.filter(pk=notif.pk).exists())


class ImpactStoriesTriggerTests(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    @mock.patch("kolibri.core.analytics.local_notifications.ACTIVITY_THRESHOLD", 5)
    @mock.patch("kolibri.core.analytics.local_notifications.ROLLING_WINDOW_DAYS", 90)
    def test_creates_row_when_conditions_met(self):
        _create_sessions(self.user, 10, days_ago=10)
        created = create_impact_stories_notification_if_needed()
        self.assertTrue(created)
        self.assertTrue(
            LocalNotification.objects.filter(key=IMPACT_STORIES_KEY).exists()
        )

    @mock.patch("kolibri.core.analytics.local_notifications.ACTIVITY_THRESHOLD", 5)
    def test_skips_when_row_already_exists(self):
        LocalNotification.objects.create(key=IMPACT_STORIES_KEY)
        _create_sessions(self.user, 10)
        created = create_impact_stories_notification_if_needed()
        self.assertFalse(created)
        self.assertEqual(
            LocalNotification.objects.filter(key=IMPACT_STORIES_KEY).count(), 1
        )

    @mock.patch("kolibri.core.analytics.local_notifications.ACTIVITY_THRESHOLD", 5)
    def test_skips_when_facility_is_kdp_registered(self):
        self.facility.dataset.registered = True
        self.facility.dataset.save()
        _create_sessions(self.user, 10)
        created = create_impact_stories_notification_if_needed()
        self.assertFalse(created)
        self.assertFalse(
            LocalNotification.objects.filter(key=IMPACT_STORIES_KEY).exists()
        )

    @mock.patch("kolibri.core.analytics.local_notifications.ACTIVITY_THRESHOLD", 100)
    def test_skips_when_activity_below_threshold(self):
        _create_sessions(self.user, 10)
        created = create_impact_stories_notification_if_needed()
        self.assertFalse(created)
        self.assertFalse(
            LocalNotification.objects.filter(key=IMPACT_STORIES_KEY).exists()
        )

    @mock.patch("kolibri.core.analytics.local_notifications.ACTIVITY_THRESHOLD", 5)
    @mock.patch("kolibri.core.analytics.local_notifications.ROLLING_WINDOW_DAYS", 30)
    def test_skips_when_activity_outside_rolling_window(self):
        _create_sessions(self.user, 10, days_ago=60)
        created = create_impact_stories_notification_if_needed()
        self.assertFalse(created)
        self.assertFalse(
            LocalNotification.objects.filter(key=IMPACT_STORIES_KEY).exists()
        )


class LocalNotificationTaskTests(TransactionTestCase):
    databases = "__all__"

    def setUp(self):
        job_storage.clear(force=True)
        _generate_local_notifications.schedule.apply(_generate_local_notifications)

    def _assert_next_run_in(self, delta):
        orm_job = job_storage.get_orm_job(LOCAL_NOTIFICATION_JOB_ID)
        self.assertEqual(orm_job.state, State.QUEUED)
        self.assertIsNone(orm_job.repeat)
        self.assertEqual(orm_job.interval, timedelta(days=1).total_seconds())
        self.assertAlmostEqual(
            orm_job.scheduled_time,
            local_now() + delta,
            delta=timedelta(minutes=1),
        )

    def test_next_run_is_one_day_later_when_no_notification_created(self):
        execute_job(LOCAL_NOTIFICATION_JOB_ID)
        self._assert_next_run_in(timedelta(days=1))

    @mock.patch(
        "kolibri.core.analytics.tasks.create_impact_stories_notification_if_needed",
        side_effect=Exception,
    )
    def test_next_run_is_one_day_later_when_evaluator_raises(self, _):
        execute_job(LOCAL_NOTIFICATION_JOB_ID)
        self._assert_next_run_in(timedelta(days=1))

    @mock.patch("kolibri.core.analytics.local_notifications.ACTIVITY_THRESHOLD", 5)
    def test_next_run_is_after_cooldown_when_notification_created(self):
        _create_sessions(
            FacilityUserFactory.create(facility=FacilityFactory.create()), 10
        )
        execute_job(LOCAL_NOTIFICATION_JOB_ID)
        self.assertTrue(
            LocalNotification.objects.filter(key=IMPACT_STORIES_KEY).exists()
        )
        self._assert_next_run_in(timedelta(days=COOLDOWN_DAYS))
