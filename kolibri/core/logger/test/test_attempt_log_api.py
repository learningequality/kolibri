import uuid

from django.urls import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.utils.time_utils import local_now


class AttemptLogViewSetTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        provision_device()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)
        cls.user = FacilityUserFactory.create(facility=cls.facility)

        now = local_now()
        content_id = uuid.uuid4().hex
        channel_id = uuid.uuid4().hex

        cls.session_log = ContentSessionLog.objects.create(
            user=cls.user,
            content_id=content_id,
            channel_id=channel_id,
            start_timestamp=now,
            end_timestamp=now,
            kind="exercise",
        )
        cls.summary_log = ContentSummaryLog.objects.create(
            user=cls.user,
            content_id=content_id,
            channel_id=channel_id,
            start_timestamp=now,
            end_timestamp=now,
            kind="exercise",
        )
        cls.mastery_log = MasteryLog.objects.create(
            user=cls.user,
            summarylog=cls.summary_log,
            mastery_criterion={"type": "m_of_n", "m": 3, "n": 5},
            start_timestamp=now,
            end_timestamp=now,
            mastery_level=1,
        )
        cls.attempt_log = AttemptLog.objects.create(
            user=cls.user,
            masterylog=cls.mastery_log,
            sessionlog=cls.session_log,
            item="item1",
            start_timestamp=now,
            end_timestamp=now,
            correct=1.0,
            time_spent=10.0,
            answer={"response": "A"},
            interaction_history=[
                {"type": "answer", "answer": {"response": "A"}, "correct": 1.0}
            ],
        )

    def test_list_returns_empty_for_unauthenticated(self):
        response = self.client.get(
            reverse("kolibri:core:attemptlog-list"),
            data={"masterylog": self.mastery_log.id, "user": self.user.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_list_response_fields(self):
        self.client.force_login(self.admin)
        response = self.client.get(
            reverse("kolibri:core:attemptlog-list"),
            data={"masterylog": self.mastery_log.id, "user": self.user.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        attempt = response.data[0]
        self.assertEqual(
            set(attempt.keys()),
            {
                "id",
                "item",
                "start_timestamp",
                "end_timestamp",
                "completion_timestamp",
                "time_spent",
                "complete",
                "correct",
                "hinted",
                "answer",
                "simple_answer",
                "interaction_history",
                "user",
                "error",
                "masterylog",
                "sessionlog",
            },
        )

    def test_list_filter_by_masterylog(self):
        self.client.force_login(self.admin)
        response = self.client.get(
            reverse("kolibri:core:attemptlog-list"),
            data={"masterylog": self.mastery_log.id, "user": self.user.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.attempt_log.id))

    def test_list_filter_by_user(self):
        self.client.force_login(self.admin)
        response = self.client.get(
            reverse("kolibri:core:attemptlog-list"),
            data={"user": self.user.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_list_filter_by_item(self):
        self.client.force_login(self.admin)
        response_match = self.client.get(
            reverse("kolibri:core:attemptlog-list"),
            data={"user": self.user.id, "item": "item1"},
        )
        self.assertEqual(len(response_match.data), 1)

        response_no_match = self.client.get(
            reverse("kolibri:core:attemptlog-list"),
            data={"user": self.user.id, "item": "nonexistent"},
        )
        self.assertEqual(len(response_no_match.data), 0)

    def test_retrieve(self):
        self.client.force_login(self.admin)
        response = self.client.get(
            reverse(
                "kolibri:core:attemptlog-detail",
                kwargs={"pk": self.attempt_log.id},
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], str(self.attempt_log.id))
        self.assertEqual(response.data["item"], "item1")
        self.assertEqual(response.data["correct"], 1.0)
        self.assertEqual(response.data["user"], str(self.user.id))
        self.assertEqual(response.data["masterylog"], str(self.mastery_log.id))
        self.assertEqual(response.data["sessionlog"], str(self.session_log.id))

    def test_retrieve_not_found_for_unauthenticated(self):
        response = self.client.get(
            reverse(
                "kolibri:core:attemptlog-detail",
                kwargs={"pk": self.attempt_log.id},
            )
        )
        self.assertEqual(response.status_code, 404)
