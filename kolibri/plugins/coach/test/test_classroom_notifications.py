import datetime
import uuid
from unittest.mock import patch

from django.db import connections
from django.db.utils import DatabaseError
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from le_utils.constants import content_kinds
from le_utils.constants import modalities

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import TestType
from kolibri.core.courses.models import UnitTestAssignment
from kolibri.core.logger.utils.pre_post_test import get_synthetic_content_id
from kolibri.core.notifications.models import LearnerProgressNotification
from kolibri.core.notifications.models import NotificationEventType
from kolibri.core.notifications.models import NotificationObjectType
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
            "course_session_id",
            "title",
            "kind",
            "lesson_title",
            "test_type",
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

    def test_notification_includes_course_session_id(self):
        session_id = uuid.uuid4()
        LearnerProgressNotification.objects.create(
            classroom_id=self.classroom.id,
            user_id=self.learner.id,
            notification_object="Resource",
            notification_event="Started",
            course_session_id=session_id,
        )
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["course_session_id"], session_id.hex)


def _make_node(title, kind, parent=None, modality=None):
    return ContentNode.objects.create(
        id=uuid.uuid4().hex,
        content_id=uuid.uuid4().hex,
        channel_id=uuid.uuid4().hex,
        title=title,
        kind=kind,
        modality=modality,
        available=True,
        parent=parent,
    )


class CourseNotificationFieldsTestCase(APITestCase):
    databases = "__all__"

    course_fields = ("title", "kind", "lesson_title", "test_type")
    list_name = "kolibri:kolibri.plugins.coach:notifications-list"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="My Facility")
        cls.classroom = Classroom.objects.create(
            name="My Classroom", parent=cls.facility
        )
        cls.coach = helpers.create_coach(
            username="classroom_coach",
            password=DUMMY_PASSWORD,
            facility=cls.facility,
            classroom=cls.classroom,
        )
        cls.learner = helpers.create_learner(
            username="learner", password=DUMMY_PASSWORD, facility=cls.facility
        )

        cls.course_node = _make_node(
            "Test Course", content_kinds.TOPIC, modality=modalities.COURSE
        )
        cls.unit_node = _make_node(
            "Unit 1: Fractions",
            content_kinds.TOPIC,
            parent=cls.course_node,
            modality=modalities.UNIT,
        )
        cls.lesson_node = _make_node(
            "Adding Fractions", content_kinds.TOPIC, parent=cls.unit_node
        )
        cls.resource_node = _make_node(
            "Fractions Video", content_kinds.VIDEO, parent=cls.lesson_node
        )

        cls.session = cls._make_session()
        cls._activate_test(cls.session, cls.unit_node, TestType.Pre)

    def setUp(self):
        self.client.login(username=self.coach.username, password=DUMMY_PASSWORD)

    @classmethod
    def _make_session(cls):
        return CourseSession.objects.create(
            course=cls.course_node.id,
            title="Spring 2025",
            collection=cls.classroom,
            created_by=cls.coach,
            is_active=True,
        )

    @classmethod
    def _activate_test(cls, session, unit_node, test_type):
        UnitTestAssignment.objects.create(
            course_session=session,
            unit_contentnode_id=unit_node.id,
            collection=cls.classroom,
            test_type=test_type,
            activated_by=cls.coach,
        )

    @staticmethod
    def _quiz_id(session, unit_node, test_type):
        return get_synthetic_content_id(str(session.id), str(unit_node.id), test_type)

    def _notify(self, notification_object, **kwargs):
        kwargs.setdefault("course_session_id", self.session.id)
        return LearnerProgressNotification.objects.create(
            user_id=self.learner.id,
            classroom_id=self.classroom.id,
            notification_object=notification_object,
            notification_event=NotificationEventType.Completed,
            **kwargs,
        )

    def _get_results(self):
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )
        self.assertEqual(response.status_code, 200)
        return response.json()["results"]

    def _get_only_result(self):
        results = self._get_results()
        self.assertEqual(len(results), 1)
        return results[0]

    def _assert_course_fields(self, result, **expected):
        self.assertEqual(
            {field: result.get(field) for field in self.course_fields},
            {field: expected.get(field) for field in self.course_fields},
        )

    def test_course_resource_notification_resolves_node_and_lesson_titles(self):
        self._notify(
            NotificationObjectType.Resource,
            contentnode_id=self.resource_node.id,
            lesson_id=self.lesson_node.id,
        )
        self._assert_course_fields(
            self._get_only_result(),
            title=self.resource_node.title,
            kind=self.resource_node.kind,
            lesson_title=self.lesson_node.title,
        )

    def test_course_lesson_notification_resolves_lesson_node_title(self):
        self._notify(NotificationObjectType.Lesson, lesson_id=self.lesson_node.id)
        self._assert_course_fields(
            self._get_only_result(),
            title=self.lesson_node.title,
            kind=self.lesson_node.kind,
            lesson_title=self.lesson_node.title,
        )

    def test_course_quiz_notification_resolves_unit_title_and_test_type(self):
        self._notify(
            NotificationObjectType.Quiz,
            quiz_id=self._quiz_id(self.session, self.unit_node, TestType.Pre),
        )
        self._assert_course_fields(
            self._get_only_result(),
            title=self.unit_node.title,
            kind=self.unit_node.kind,
            test_type=TestType.Pre,
        )

    def test_course_quiz_notification_with_no_matching_assignment_is_null(self):
        self._notify(NotificationObjectType.Quiz, quiz_id=uuid.uuid4().hex)
        self._assert_course_fields(self._get_only_result())

    def test_classic_notification_fields_are_null(self):
        self._notify(
            NotificationObjectType.Resource,
            course_session_id=None,
            contentnode_id=self.resource_node.id,
            lesson_id=self.lesson_node.id,
        )
        self._assert_course_fields(self._get_only_result())

    def _count_resolution_queries(self):
        with CaptureQueriesContext(connections["default"]) as captured:
            self._get_results()
        sql = [query["sql"] for query in captured.captured_queries]
        return {
            model._meta.db_table: len(
                [statement for statement in sql if model._meta.db_table in statement]
            )
            for model in (ContentNode, UnitTestAssignment)
        }

    def test_no_assignment_lookup_without_quiz_notifications(self):
        self._notify(
            NotificationObjectType.Resource,
            contentnode_id=self.resource_node.id,
            lesson_id=self.lesson_node.id,
        )
        counts = self._count_resolution_queries()
        self.assertEqual(counts[UnitTestAssignment._meta.db_table], 0)

    def test_resolution_query_count_does_not_grow_with_notifications(self):
        self._notify(
            NotificationObjectType.Resource,
            contentnode_id=self.resource_node.id,
            lesson_id=self.lesson_node.id,
        )
        self._notify(
            NotificationObjectType.Quiz,
            quiz_id=self._quiz_id(self.session, self.unit_node, TestType.Pre),
        )
        two_notifications = self._count_resolution_queries()
        self.assertEqual(
            two_notifications,
            {ContentNode._meta.db_table: 1, UnitTestAssignment._meta.db_table: 1},
        )

        other_session = self._make_session()
        other_unit_node = _make_node(
            "Unit 2: Decimals",
            content_kinds.TOPIC,
            parent=self.course_node,
            modality=modalities.UNIT,
        )
        self._activate_test(other_session, other_unit_node, TestType.Post)
        self._notify(NotificationObjectType.Lesson, lesson_id=self.lesson_node.id)
        self._notify(
            NotificationObjectType.Quiz,
            course_session_id=other_session.id,
            quiz_id=self._quiz_id(other_session, other_unit_node, TestType.Post),
        )
        self._notify(
            NotificationObjectType.Resource,
            course_session_id=other_session.id,
            contentnode_id=self.resource_node.id,
            lesson_id=self.lesson_node.id,
        )
        self.assertEqual(len(self._get_results()), 5)

        self.assertEqual(self._count_resolution_queries(), two_notifications)
