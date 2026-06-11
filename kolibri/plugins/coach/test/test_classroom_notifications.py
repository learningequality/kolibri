import datetime
from unittest.mock import patch

from django.db.utils import DatabaseError
from django.urls import reverse

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.utils.time_utils import local_now

from . import helpers

DUMMY_PASSWORD = "password"


class ClassroomNotificationsTestCase(APITestCase):
    databases = "__all__"

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="My Facility")
        self.classroom = Classroom.objects.create(
            name="My Classroom", parent=self.facility
        )
        self.another_classroom = Classroom.objects.create(
            name="My Another Classroom", parent=self.facility
        )

        self.facility_admin = helpers.create_facility_admin(
            username="facility_admin", password=DUMMY_PASSWORD, facility=self.facility
        )
        self.facility_coach = helpers.create_coach(
            username="facility_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            is_facility_coach=True,
        )
        self.classroom_coach = helpers.create_coach(
            username="classroom_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
        )
        self.another_classroom_coach = helpers.create_coach(
            username="another_classroom_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.another_classroom,
        )
        self.learner = helpers.create_learner(
            username="learner", password=DUMMY_PASSWORD, facility=self.facility
        )

        self.basename = "kolibri:kolibri.plugins.coach:notifications"
        self.list_name = self.basename + "-list"

    def test_anon_user_cannot_access_list(self):
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_list(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 403)

    def test_another_classroom_coach_cannot_access_list(self):
        self.client.login(
            username=self.another_classroom_coach.username,
            password=DUMMY_PASSWORD,
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 403)

    def test_classroom_coach_can_access_list(self):
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 200)

    def test_facility_coach_can_access_list(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 200)

    def test_facility_admin_can_access_list(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 200)

    def test_database_error_does_not_crash(self):
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )

        with patch(
            "kolibri.plugins.coach.viewsets.classroom_notifications.ClassroomNotificationsFilter.filter_queryset",
            side_effect=DatabaseError,
        ):
            response = self.client.get(
                reverse(self.list_name), {"classroom_id": self.classroom.id}
            )

        self.assertEqual(response.status_code, 200)

    def test_list_response_has_expected_top_level_keys(self):
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("results", data)
        self.assertIn("coaches_polling", data)
        self.assertIn("more_results", data)

    def _create_notification_and_get_response(self):
        LearnerProgressNotification.objects.create(
            user_id=self.learner.id,
            classroom_id=self.classroom.id,
            notification_object="Resource",
            notification_event="Started",
        )
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        return self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

    def test_notification_fields_are_renamed_in_response(self):
        response = self._create_notification_and_get_response()
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["results"]), 1)
        result = data["results"][0]
        # Field renames: notification_object → object, notification_event → event
        self.assertIn("object", result)
        self.assertIn("event", result)
        self.assertNotIn("notification_object", result)
        self.assertNotIn("notification_event", result)
        self.assertEqual(result["object"], "Resource")
        self.assertEqual(result["event"], "Started")

    def test_notification_result_has_all_expected_fields(self):
        response = self._create_notification_and_get_response()
        self.assertEqual(response.status_code, 200)
        result = response.json()["results"][0]
        expected_fields = {
            "id",
            "timestamp",
            "user_id",
            "classroom_id",
            "lesson_id",
            "assignment_collections",
            "reason",
            "quiz_id",
            "quiz_num_correct",
            "quiz_num_answered",
            "contentnode_id",
            "object",
            "event",
        }
        self.assertEqual(set(result.keys()), expected_fields)

    def test_more_results_true_when_limit_exceeded(self):
        base_time = local_now()
        for i in range(3):
            LearnerProgressNotification.objects.create(
                user_id=self.learner.id,
                classroom_id=self.classroom.id,
                notification_object="Resource",
                notification_event="Started",
                timestamp=base_time - datetime.timedelta(seconds=i),
            )
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name),
            {"classroom_id": self.classroom.id, "limit": "1"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["results"]), 1)
        self.assertTrue(data["more_results"])
