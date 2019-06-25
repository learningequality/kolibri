from django.core.urlresolvers import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from ..constants.nutrition_endpoints import PINGBACK
from ..models import PingbackNotification
from ..models import PingbackNotificationDismissed
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory


class PingbackNotificationTestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = FacilityFactory.create()
        self.user = FacilityUserFactory(facility=self.facility)
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )
        data = {
            "id": "ping",
            "version_range": "<2.0.0",
            "timestamp": timezone.now(),
            "source": PINGBACK,
        }
        self.notification = PingbackNotification.objects.create(**data)

    def test_get_notification(self):
        response = self.client.get(
            reverse(
                "kolibri:core:pingbacknotification-detail",
                kwargs={"pk": self.notification.id},
            ),
            format="json",
        )
        self.assertEqual(
            response.data["version_range"], self.notification.version_range
        )

    def test_do_not_get_dismissed_notifications(self):
        PingbackNotificationDismissed.objects.create(
            user=self.user, notification=self.notification
        )
        response = self.client.get(reverse("kolibri:core:pingbacknotification-list"))
        expected_output = (
            PingbackNotification.objects.count()
            - PingbackNotificationDismissed.objects.count()
        )
        self.assertEqual(len(response.data), expected_output)

    def test_filter_by_semantic_versioning(self):
        data = {
            "id": "pong",
            "version_range": "<0.0.1",
            "timestamp": timezone.now(),
            "source": PINGBACK,
        }
        PingbackNotification.objects.create(**data)
        response = self.client.get(reverse("kolibri:core:pingbacknotification-list"))
        self.assertEqual(len(response.data), PingbackNotification.objects.count() - 1)


class PingbackNotificationDismissedTestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory(facility=self.facility)
        self.facility.add_role(self.admin, role_kinds.ADMIN)
        self.user = FacilityUserFactory(facility=self.facility)
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

        data = {
            "id": "ping",
            "version_range": "<0.11.0",
            "timestamp": timezone.now(),
            "source": PINGBACK,
        }
        self.notification = PingbackNotification.objects.create(**data)

    def test_create_notification(self):
        response = self.client.post(
            reverse("kolibri:core:pingbacknotificationdismissed-list"),
            {"user": self.admin.id, "notification": self.notification.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PingbackNotificationDismissed.objects.count(), 1)

    def test_filter_notification(self):
        PingbackNotificationDismissed.objects.create(
            user=self.admin, notification=self.notification
        )
        response = self.client.get(
            reverse("kolibri:core:pingbacknotificationdismissed-list"),
            {"user": self.admin.id, "notification": self.notification.id},
            format="json",
        )
        self.assertEqual(
            len(response.data), PingbackNotificationDismissed.objects.count()
        )

    def test_filter_non_existent_notification(self):
        response = self.client.get(
            reverse("kolibri:core:pingbacknotificationdismissed-list"),
            {"user": self.admin.id, "notification": "non-existent-id"},
            format="json",
        )
        self.assertEqual(len(response.data), 0)

    def test_can_not_create_other_user_notification(self):
        response = self.client.post(
            reverse("kolibri:core:pingbacknotificationdismissed-list"),
            {"user": self.user.id, "notification": self.notification.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
