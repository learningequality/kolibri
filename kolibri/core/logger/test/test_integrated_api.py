# -*- coding: utf-8 -*-
"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import uuid

from django.core.urlresolvers import reverse
from django.http.cookie import SimpleCookie
from le_utils.constants import content_kinds
from le_utils.constants import exercises
from mock import patch
from rest_framework.test import APITestCase
from six import string_types

from ..models import AttemptLog
from ..models import ContentSessionLog
from ..models import ContentSummaryLog
from ..models import MasteryLog
from .factory_logger import FacilityUserFactory
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import DUMMY_PASSWORD
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.constants import interaction_types
from kolibri.core.notifications.api import create_summarylog
from kolibri.core.notifications.api import parse_attemptslog
from kolibri.core.notifications.api import parse_summarylog
from kolibri.core.notifications.api import quiz_answered_notification
from kolibri.core.notifications.api import quiz_completed_notification
from kolibri.core.notifications.api import quiz_started_notification
from kolibri.utils.time_utils import local_now


def create_assigned_quiz_for_user(user):
    coach = FacilityUserFactory.create(facility=user.facility)
    classroom = Classroom.objects.create(name="classroom", parent=user.facility)
    classroom.add_member(user)

    quiz = Exam.objects.create(
        title="quiz", question_count=5, collection=classroom, creator=coach, active=True
    )
    ExamAssignment.objects.create(exam=quiz, collection=classroom, assigned_by=coach)
    return quiz


def create_assigned_lesson_for_user(user):
    coach = FacilityUserFactory(facility=user.facility)
    classroom = Classroom.objects.create(name="classroom", parent=user.facility)
    classroom.add_member(user)
    lesson = Lesson.objects.create(
        title="lesson", created_by=coach, collection=classroom
    )
    LessonAssignment.objects.create(
        lesson=lesson, collection=classroom, assigned_by=coach
    )
    return lesson


class ProgressTrackingViewSetStartSessionFreshTestCase(APITestCase):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.channel_id = uuid.uuid4().hex
        self.content_id = uuid.uuid4().hex

        self.node = ContentNode.objects.create(
            channel_id=self.channel_id,
            content_id=self.content_id,
            id=uuid.uuid4().hex,
            kind=content_kinds.VIDEO,
        )

    def _make_request(self, data):
        post_data = {
            "node_id": self.node.id,
        }
        post_data.update(data)
        return self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

    def test_start_session_anonymous_succeeds(self):
        self.client.cookies = SimpleCookie({"visitor_id": uuid.uuid4().hex})
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertIsNotNone(log.visitor_id)
        self.assertEqual(self.node.kind, log.kind)
        self.assertEqual(log.extra_fields["context"]["node_id"], self.node.id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 0)
        result = response.json()
        self.assertEqual(result["progress"], 0)
        self.assertEqual(result["time_spent"], 0)
        self.assertEqual(result["complete"], False)
        self.assertEqual(result["extra_fields"], {})
        self.assertEqual(result["context"]["node_id"], self.node.id)

    def test_start_session_logged_in_succeeds(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(log.extra_fields["context"]["node_id"], self.node.id)
        self.assertEqual(self.node.kind, log.kind)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        result = response.json()
        self.assertEqual(result["progress"], 0)
        self.assertEqual(result["time_spent"], 0)
        self.assertEqual(result["complete"], False)
        self.assertEqual(result["extra_fields"], {})
        self.assertEqual(result["context"]["node_id"], self.node.id)

    def test_start_session_logged_in_lesson_succeeds(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        lesson = create_assigned_lesson_for_user(self.user)
        lesson_id = lesson.id
        node_id = self.node.id
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self._make_request(
                {
                    "lesson_id": lesson_id,
                    "node_id": node_id,
                }
            )
            save_queue_mock.assert_called()
            self.assertEqual(save_queue_mock.mock_calls[0][1][0], create_summarylog)
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][1], ContentSummaryLog)
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(log.extra_fields["context"]["node_id"], self.node.id)
        self.assertEqual(log.extra_fields["context"]["lesson_id"], lesson.id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        result = response.json()
        self.assertEqual(result["progress"], 0)
        self.assertEqual(result["time_spent"], 0)
        self.assertEqual(result["complete"], False)
        self.assertEqual(result["extra_fields"], {})
        self.assertEqual(result["context"]["node_id"], self.node.id)
        self.assertEqual(result["context"]["lesson_id"], lesson.id)

    def test_start_session_anonymous_lesson_fails(self):
        lesson = create_assigned_lesson_for_user(self.user)
        lesson_id = lesson.id
        node_id = self.node.id
        response = self._make_request(
            {
                "lesson_id": lesson_id,
                "node_id": node_id,
            }
        )
        self.assertEqual(response.status_code, 403)

    def test_start_assessment_session_anonymous_succeeds(self):
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 0)

    def test_start_assessment_session_logged_in_succeeds(self):
        self.node.kind = content_kinds.EXERCISE
        self.node.save()
        mastery_model = {"type": exercises.M_OF_N, "m": 8, "n": 10}
        AssessmentMetaData.objects.create(
            mastery_model=mastery_model,
            contentnode=self.node,
            id=uuid.uuid4().hex,
            number_of_assessments=20,
        )
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mastery_criterion"], mastery_model)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = MasteryLog.objects.get()
        self.assertEqual(log.mastery_criterion, mastery_model)
        result = response.json()
        self.assertEqual(result["progress"], 0)
        self.assertEqual(result["time_spent"], 0)
        self.assertEqual(result["complete"], False)
        self.assertEqual(result["extra_fields"], {})
        self.assertEqual(result["pastattempts"], [])
        self.assertEqual(result["totalattempts"], 0)
        self.assertEqual(result["context"]["node_id"], self.node.id)

    def test_start_assessment_session_anonymous_coach_assigned_fails(self):
        coach = FacilityUserFactory.create(facility=self.facility)

        quiz = Exam.objects.create(
            title="quiz", question_count=5, collection=self.facility, creator=coach
        )

        post_data = {
            "quiz_id": quiz.id,
        }
        response = self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_start_assessment_session_logged_in_coach_assigned_not_assigned_fails(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        coach = FacilityUserFactory.create(facility=self.facility)

        quiz = Exam.objects.create(
            title="quiz", question_count=5, collection=self.facility, creator=coach
        )

        post_data = {
            "quiz_id": quiz.id,
        }
        response = self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_start_assessment_session_logged_in_coach_assigned_succeeds(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        quiz = create_assigned_quiz_for_user(self.user)

        post_data = {
            "quiz_id": quiz.id,
        }
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self.client.post(
                reverse("kolibri:core:trackprogress-list"),
                data=post_data,
                format="json",
            )
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], quiz_started_notification
            )
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], MasteryLog))
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][2], string_types)
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["mastery_criterion"],
            {"type": "quiz", "coach_assigned": True},
        )
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, quiz.id)
        self.assertEqual(content_kinds.QUIZ, log.kind)
        self.assertIsNone(log.channel_id)
        self.assertEqual(log.extra_fields["context"]["quiz_id"], quiz.id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, quiz.id)
        self.assertIsNone(log.channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = MasteryLog.objects.get()
        self.assertEqual(
            log.mastery_criterion, {"type": "quiz", "coach_assigned": True}
        )
        result = response.json()
        self.assertEqual(result["progress"], 0)
        self.assertEqual(result["time_spent"], 0)
        self.assertEqual(result["complete"], False)
        self.assertEqual(result["extra_fields"], {})
        self.assertEqual(result["pastattempts"], [])
        self.assertEqual(result["totalattempts"], 0)
        self.assertEqual(result["context"]["quiz_id"], quiz.id)

    def test_start_assessment_session_logged_in_coach_assigned_quiz_not_active_fails(
        self,
    ):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        quiz = create_assigned_quiz_for_user(self.user)
        quiz.active = False
        quiz.save()

        post_data = {
            "quiz_id": quiz.id,
        }
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self.client.post(
                reverse("kolibri:core:trackprogress-list"),
                data=post_data,
                format="json",
            )
            save_queue_mock.assert_not_called()

        self.assertEqual(response.status_code, 403)

    def tearDown(self):
        self.client.logout()


class ProgressTrackingViewSetStartSessionResumeTestCase(APITestCase):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.user = FacilityUserFactory.create(facility=self.facility)

        self.channel_id = uuid.uuid4().hex
        self.content_id = uuid.uuid4().hex

        self.node = ContentNode.objects.create(
            channel_id=self.channel_id,
            content_id=self.content_id,
            id=uuid.uuid4().hex,
            kind=content_kinds.VIDEO,
        )

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
            extra_fields={"context": {"node_id": self.node.id}},
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
        )
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _make_request(self, data):
        post_data = {"node_id": self.node.id}
        post_data.update(data)
        return self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

    def test_start_session_logged_in_succeeds(self):
        new_channel_id = uuid.uuid4().hex
        self.node.channel_id = new_channel_id
        self.node.save()
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 2)
        log = ContentSessionLog.objects.filter(channel_id=new_channel_id).get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, new_channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        session_id = log.id
        self.summary_log.refresh_from_db()
        log = self.summary_log
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, new_channel_id)
        data = response.json()
        self.assertEqual(log.time_spent, data["time_spent"])
        self.assertEqual(log.progress, data["progress"])
        self.assertEqual(log.extra_fields, data["extra_fields"])
        self.assertEqual(self.node.id, data["context"]["node_id"])
        self.assertEqual(session_id, data["session_id"])

    def tearDown(self):
        self.client.logout()


class ProgressTrackingViewSetStartSessionAssessmentResumeTestCase(APITestCase):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.channel_id = uuid.uuid4().hex
        self.content_id = uuid.uuid4().hex

        self.node = ContentNode.objects.create(
            channel_id=self.channel_id,
            content_id=self.content_id,
            id=uuid.uuid4().hex,
            kind=content_kinds.EXERCISE,
        )
        self.mastery_model = {"type": exercises.M_OF_N, "m": 8, "n": 10}
        self.assessmentmetadata = AssessmentMetaData.objects.create(
            mastery_model=self.mastery_model,
            contentnode=self.node,
            id=uuid.uuid4().hex,
            number_of_assessments=20,
        )

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
            extra_fields={"context": {"node_id": self.node.id, "mastery_level": 1}},
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
        )

        self.mastery_log = MasteryLog.objects.create(
            mastery_criterion=self.mastery_model,
            summarylog=self.summary_log,
            start_timestamp=self.summary_log.start_timestamp,
            user=self.user,
            mastery_level=1,
        )
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _make_request(self, data):
        post_data = {"node_id": self.node.id}
        post_data.update(data)
        return self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

    def test_start_assessment_session_logged_in_succeeds(self):
        new_channel_id = uuid.uuid4().hex
        self.node.channel_id = new_channel_id
        self.node.save()
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mastery_criterion"], self.mastery_model)
        self.assertEqual(ContentSessionLog.objects.all().count(), 2)
        log = ContentSessionLog.objects.filter(channel_id=new_channel_id).get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, new_channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        session_id = log.id
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, new_channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        data = response.json()
        self.assertEqual(log.time_spent, data["time_spent"])
        self.assertEqual(log.progress, data["progress"])
        self.assertEqual(log.extra_fields, data["extra_fields"])
        self.assertEqual(self.node.id, data["context"]["node_id"])
        self.assertEqual(session_id, data["session_id"])
        log = MasteryLog.objects.get()
        self.assertEqual(log.mastery_level, data["context"]["mastery_level"])
        self.assertEqual(log.mastery_level, data["context"]["mastery_level"])
        self.assertEqual(log.mastery_criterion, self.mastery_model)
        self.assertEqual(data["mastery_criterion"], self.mastery_model)
        self.assertEqual(log.complete, data["complete"])

    def test_start_assessment_session_logged_in_changed_mastery_model_succeeds(self):
        self.assessmentmetadata.mastery_model = {
            "type": exercises.M_OF_N,
            "m": 9,
            "n": 10,
        }
        self.assessmentmetadata.save()
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mastery_criterion"], self.mastery_model)
        log = MasteryLog.objects.get()
        self.assertEqual(log.mastery_criterion, self.mastery_model)

    def test_start_assessment_session_logged_in_completed_no_new(self):
        self.mastery_log.complete = True
        self.mastery_log.save()
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(MasteryLog.objects.all().count(), 1)

    def test_start_assessment_session_logged_in_previous_completed_no_new(self):
        self.mastery_log.complete = True
        self.mastery_log.save()
        self.mastery_log = MasteryLog.objects.create(
            mastery_criterion=self.mastery_model,
            summarylog=self.summary_log,
            start_timestamp=self.summary_log.start_timestamp,
            user=self.user,
            mastery_level=2,
        )
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(MasteryLog.objects.all().count(), 2)
        self.assertEqual(response.data["complete"], False)

    def test_start_assessment_session_logged_in_completed_repeat_new(self):
        self.mastery_log.complete = True
        self.mastery_log.save()
        response = self._make_request(
            {
                "repeat": True,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(MasteryLog.objects.all().count(), 2)

    def test_start_assessment_session_logged_in_with_history(self):
        timestamp = local_now()
        interaction = {
            "type": interaction_types.ANSWER,
            "answer": {"response": "hinty mchintyson"},
            "correct": 0,
        }
        for i in range(0, self.mastery_model["n"] + 5):
            AttemptLog.objects.create(
                masterylog=self.mastery_log,
                sessionlog=self.session_log,
                start_timestamp=timestamp,
                end_timestamp=timestamp,
                correct=0,
                item="test_item_id{}".format(i),
                user=self.user,
                answer=interaction["answer"],
                interaction_history=[interaction],
            )
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["totalattempts"], self.mastery_model["n"] + 5)
        self.assertEqual(len(response.json()["pastattempts"]), self.mastery_model["n"])

    def test_start_assessment_session_logged_in_with_history_unknown_type(self):
        timestamp = local_now()
        interaction = {
            "type": interaction_types.ANSWER,
            "answer": {"response": "hinty mchintyson"},
            "correct": 0,
        }
        self.mastery_log.mastery_criterion = {"type": "unknown"}
        self.mastery_log.save()
        for i in range(0, 15):
            AttemptLog.objects.create(
                masterylog=self.mastery_log,
                sessionlog=self.session_log,
                start_timestamp=timestamp,
                end_timestamp=timestamp,
                correct=0,
                item="test_item_id{}".format(i),
                user=self.user,
                answer=interaction["answer"],
                interaction_history=[interaction],
            )
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["totalattempts"], 15)
        self.assertEqual(len(response.json()["pastattempts"]), 10)

    def test_start_assessment_session_logged_in_with_history_in_a_row_type(self):
        timestamp = local_now()
        interaction = {
            "type": interaction_types.ANSWER,
            "answer": {"response": "hinty mchintyson"},
            "correct": 0,
        }
        self.mastery_log.mastery_criterion = {"type": exercises.NUM_CORRECT_IN_A_ROW_2}
        self.mastery_log.save()
        for i in range(0, 15):
            AttemptLog.objects.create(
                masterylog=self.mastery_log,
                sessionlog=self.session_log,
                start_timestamp=timestamp,
                end_timestamp=timestamp,
                correct=0,
                item="test_item_id{}".format(i),
                user=self.user,
                answer=interaction["answer"],
                interaction_history=[interaction],
            )
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["totalattempts"], 15)
        self.assertEqual(len(response.json()["pastattempts"]), 2)

    def test_start_assessment_session_logged_in_with_history_quiz_type(self):
        timestamp = local_now()
        interaction = {
            "type": interaction_types.ANSWER,
            "answer": {"response": "hinty mchintyson"},
            "correct": 0,
        }
        self.mastery_log.mastery_criterion = {"type": "quiz", "coach_assigned": True}
        self.mastery_log.save()
        for i in range(0, 15):
            AttemptLog.objects.create(
                masterylog=self.mastery_log,
                sessionlog=self.session_log,
                start_timestamp=timestamp,
                end_timestamp=timestamp,
                correct=0,
                item="{}:test_item_id".format(i),
                user=self.user,
                answer=interaction["answer"],
                interaction_history=[interaction],
            )
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["totalattempts"], 15)
        self.assertEqual(len(response.json()["pastattempts"]), 15)

    def tearDown(self):
        self.client.logout()


class ProgressTrackingViewSetStartSessionCoachQuizResumeTestCase(APITestCase):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.quiz = create_assigned_quiz_for_user(self.user)

        self.content_id = self.quiz.id

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="quiz",
            extra_fields={"context": {"quiz_id": self.quiz.id, "mastery_level": -1}},
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="quiz",
        )

        self.mastery_log = MasteryLog.objects.create(
            mastery_criterion={"type": "quiz", "coach_assigned": True},
            summarylog=self.summary_log,
            start_timestamp=self.summary_log.start_timestamp,
            user=self.user,
            mastery_level=-1,
        )
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _make_request(self, data):
        return self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=data,
            format="json",
        )

    def test_start_assessment_session_logged_in_succeeds(self):
        response = self._make_request(
            {
                "quiz_id": self.content_id,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["mastery_criterion"], self.mastery_log.mastery_criterion
        )
        self.assertEqual(ContentSessionLog.objects.all().count(), 2)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertIsNone(log.channel_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)

    def test_start_assessment_session_logged_in_quiz_not_active_fails(self):
        self.quiz.active = False
        self.quiz.save()
        response = self._make_request(
            {
                "quiz_id": self.content_id,
            }
        )

        self.assertEqual(response.status_code, 403)

    def test_start_assessment_session_logged_in_quiz_complete_fails(self):
        self.mastery_log.complete = True
        self.mastery_log.save()
        response = self._make_request(
            {
                "quiz_id": self.content_id,
            }
        )

        self.assertEqual(response.status_code, 403)

    def test_start_assessment_session_logged_in_completed_repeat_new(self):
        self.mastery_log.complete = True
        self.mastery_log.save()
        response = self._make_request(
            {
                "quiz_id": self.content_id,
                "repeat": True,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(MasteryLog.objects.all().count(), 2)

    def test_start_assessment_session_logged_in_with_history_assigned_quiz(self):
        timestamp = local_now()
        interaction = {
            "type": interaction_types.ANSWER,
            "answer": {"response": "hinty mchintyson"},
            "correct": 0,
        }
        self.mastery_log.mastery_criterion = {"type": "quiz", "coach_assigned": True}
        self.mastery_log.save()
        for i in range(0, 15):
            AttemptLog.objects.create(
                masterylog=self.mastery_log,
                sessionlog=self.session_log,
                start_timestamp=timestamp,
                end_timestamp=timestamp,
                correct=0,
                item="{}:test_item_id".format(i),
                user=self.user,
                answer=interaction["answer"],
                interaction_history=[interaction],
            )
        response = self._make_request(
            {
                "quiz_id": self.content_id,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["totalattempts"], 15)
        self.assertEqual(len(response.json()["pastattempts"]), 15)
        for attempt in response.json()["pastattempts"]:
            number, item = attempt["item"].split(":")
            self.assertEqual(item, "test_item_id")
            self.assertTrue(0 <= int(number) < 15)

    def tearDown(self):
        self.client.logout()


class UpdateSessionBase(object):
    def _make_request(self, data):
        data["context"] = {"node_id": self.node.id}
        return self.client.put(
            reverse(
                "kolibri:core:trackprogress-detail", kwargs={"pk": self.session_log.id}
            ),
            data=data,
            format="json",
        )

    def test_update_session_succeeds(self):
        response = self._make_request({})

        self.assertEqual(response.status_code, 200)

    def test_update_session_progress_delta_succeeds(self):
        self._update_logs("progress", 0.1)
        response = self._make_request(
            {
                "progress_delta": 0.1,
            }
        )

        self.assertEqual(response.status_code, 200)
        self._assert_logs_value("progress", 0.2)

    def test_update_session_progress_delta_overflow_succeeds(self):
        self._update_logs("progress", 0.9)
        response = self._make_request(
            {
                "progress_delta": 0.9,
            }
        )

        self.assertEqual(response.status_code, 200)
        self._assert_logs_value("progress", 1.0)

    def test_update_session_absolute_progress_succeeds(self):
        self._update_logs("progress", 0.3)
        response = self._make_request(
            {
                "progress": 0.1,
            }
        )

        self.assertEqual(response.status_code, 200)
        self._assert_logs_value("progress", 0.1)

    def test_update_session_absolute_progress_and_progress_delta_fails(self):
        response = self._make_request(
            {
                "progress": 0.1,
                "progress_delta": 0.1,
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_session_time_spent_delta(self):
        self._update_logs("time_spent", 30)
        response = self._make_request(
            {
                "time_spent_delta": 40,
            }
        )

        self.assertEqual(response.status_code, 200)
        self._assert_logs_value("time_spent", 70)


class ProgressTrackingViewSetAnonymousUpdateSessionTestCase(
    UpdateSessionBase, APITestCase
):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()

        self.channel_id = uuid.uuid4().hex
        self.content_id = uuid.uuid4().hex

        self.node = ContentNode.objects.create(
            channel_id=self.channel_id,
            content_id=self.content_id,
            id=uuid.uuid4().hex,
            kind=content_kinds.VIDEO,
        )

        self.session_log = ContentSessionLog.objects.create(
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
            extra_fields={"context": {"node_id": self.node.id}},
        )

    def _update_logs(self, field, value):
        setattr(self.session_log, field, value)
        self.session_log.save()

    def _assert_logs_value(self, field, value):
        self.session_log.refresh_from_db()
        self.assertEqual(getattr(self.session_log, field), value)

    def test_update_session_absolute_progress_triggers_completion(self):
        self._update_logs("progress", 0.3)
        response = self._make_request(
            {
                "progress": 1.0,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)

    def test_update_session_progress_delta_triggers_completion(self):
        self._update_logs("progress", 0.9)
        response = self._make_request(
            {
                "progress_delta": 0.1,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)

    def test_wrong_user_session_404(self):
        user = FacilityUserFactory.create(facility=self.facility)
        session_log = ContentSessionLog.objects.create(
            user=user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
            extra_fields={"context": {"node_id": self.node.id}},
        )
        response = self.client.put(
            reverse("kolibri:core:trackprogress-detail", kwargs={"pk": session_log.id}),
            data={},
            format="json",
        )
        self.assertEqual(response.status_code, 404)


class ProgressTrackingViewSetLoggedInUpdateSessionTestCase(
    UpdateSessionBase, APITestCase
):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.channel_id = uuid.uuid4().hex
        self.content_id = uuid.uuid4().hex

        self.node = ContentNode.objects.create(
            channel_id=self.channel_id,
            content_id=self.content_id,
            id=uuid.uuid4().hex,
            kind=content_kinds.VIDEO,
        )

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
            extra_fields={"context": {"node_id": self.node.id}},
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
        )
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _update_logs(self, field, value):
        setattr(self.session_log, field, value)
        setattr(self.summary_log, field, value)
        self.session_log.save()
        self.summary_log.save()

    def _assert_logs_value(self, field, value):
        self.session_log.refresh_from_db()
        self.assertEqual(getattr(self.session_log, field), value)
        self.summary_log.refresh_from_db()
        self.assertEqual(getattr(self.summary_log, field), value)

    def test_update_session_absolute_progress_triggers_completion(self):
        self._update_logs("progress", 0.3)
        response = self._make_request(
            {
                "progress": 1.0,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(1.0, log.progress)

    def test_update_session_absolute_progress_in_lesson_triggers_completion(self):
        self._update_logs("progress", 0.3)
        lesson = create_assigned_lesson_for_user(self.user)
        lesson_id = lesson.id
        self.session_log.extra_fields = {
            "context": {"node_id": self.node.id, "lesson_id": lesson_id}
        }
        self.session_log.save()
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self._make_request(
                {
                    "progress": 1.0,
                }
            )
            save_queue_mock.assert_called()
            self.assertEqual(save_queue_mock.mock_calls[0][1][0], parse_summarylog)
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][1], ContentSummaryLog)
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(1.0, log.progress)

    def test_update_session_progress_delta_triggers_completion(self):
        self._update_logs("progress", 0.9)
        response = self._make_request(
            {
                "progress_delta": 0.1,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(1.0, log.progress)

    def test_anonymous_user_session_404(self):
        session_log = ContentSessionLog.objects.create(
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
            extra_fields={"context": {"node_id": self.node.id}},
        )
        response = self.client.put(
            reverse("kolibri:core:trackprogress-detail", kwargs={"pk": session_log.id}),
            data={},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_wrong_user_session_404(self):
        user = FacilityUserFactory.create(facility=self.facility)
        session_log = ContentSessionLog.objects.create(
            user=user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
            extra_fields={"context": {"node_id": self.node.id}},
        )
        response = self.client.put(
            reverse("kolibri:core:trackprogress-detail", kwargs={"pk": session_log.id}),
            data={},
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def tearDown(self):
        self.client.logout()


class ProgressTrackingViewSetUpdateSessionAssessmentBase(object):
    def _make_request(self, data):
        return self.client.put(
            reverse(
                "kolibri:core:trackprogress-detail", kwargs={"pk": self.session_log.id}
            ),
            data=data,
            format="json",
        )

    def test_update_assessment_session_no_attempt_id_or_item_id_fails(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "answer": {"response": "test"},
                        "correct": 1.0,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_session_no_answer_non_error_fails(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "item": self.item,
                        "correct": 1.0,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_no_correct_fails(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "item": self.item,
                        "answer": {"response": "test"},
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_no_time_spent_fails(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "item": self.item,
                        "answer": {"response": "test"},
                        "correct": 1.0,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_session_create_attempt_succeeds(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "item": self.item,
                        "answer": {"response": "test"},
                        "correct": 1.0,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.answer, {"response": "test"})
        self.assertEqual(attempt.time_spent, 10)

    def test_update_assessment_session_create_errored_attempt_succeeds(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "item": self.item,
                        "error": True,
                        "correct": 1.0,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.answer, {})
        self.assertEqual(attempt.error, True)
        self.assertEqual(attempt.time_spent, 10)
        self.assertEqual(
            attempt.interaction_history[0],
            {
                "type": interaction_types.ERROR,
            },
        )

    def test_update_assessment_session_create_hinted_attempt_succeeds(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "item": self.item,
                        "hinted": True,
                        "answer": {"response": "hinty mchintyson"},
                        "correct": 1.0,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.answer, {"response": "hinty mchintyson"})
        self.assertEqual(attempt.hinted, True)
        self.assertEqual(attempt.time_spent, 10)
        self.assertEqual(
            attempt.interaction_history[0],
            {
                "type": interaction_types.HINT,
                "answer": {"response": "hinty mchintyson"},
            },
        )

    def test_update_assessment_session_create_multiple_responses_succeeds(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "item": self.item,
                        "hinted": True,
                        "answer": {"response": "hinty mchintyson"},
                        "correct": 1.0,
                        "time_spent": 10,
                    },
                    {
                        "item": self.item,
                        "error": True,
                        "correct": 1.0,
                        "time_spent": 20,
                    },
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.answer, {"response": "hinty mchintyson"})
        self.assertEqual(attempt.hinted, True)
        self.assertEqual(attempt.error, True)
        self.assertEqual(attempt.time_spent, 20)
        self.assertEqual(
            attempt.interaction_history[0],
            {
                "type": interaction_types.HINT,
                "answer": {"response": "hinty mchintyson"},
            },
        )
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.ERROR,
            },
        )

    def test_update_assessment_session_create_multiple_responses_replace_succeeds(self):

        response = self._make_request(
            {
                "interactions": [
                    {
                        "item": self.item,
                        "hinted": True,
                        "answer": {"response": "hinty mchintyson"},
                        "correct": 1.0,
                        "time_spent": 10,
                    },
                    {
                        "item": self.item,
                        "error": True,
                        "correct": 0.0,
                        "time_spent": 20,
                        "replace": True,
                    },
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 0.0)
        self.assertEqual(attempt.answer, {"response": "hinty mchintyson"})
        self.assertEqual(attempt.hinted, True)
        self.assertEqual(attempt.error, True)
        self.assertEqual(attempt.time_spent, 20)
        self.assertEqual(
            attempt.interaction_history[0],
            {
                "type": interaction_types.HINT,
                "answer": {"response": "hinty mchintyson"},
            },
        )
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.ERROR,
            },
        )

    def test_update_assessment_session_update_attempt_succeeds(self):
        timestamp = local_now()

        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            item=self.item,
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "test"},
                        "correct": 1,
                        "time_spent": 10,
                        "replace": True,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.answer, {"response": "test"})
        self.assertEqual(attempt.time_spent, 10)
        self.assertEqual(attempt.interaction_history[0], hinteraction)
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.ANSWER,
                "answer": {"response": "test"},
                "correct": 1.0,
            },
        )

    def test_update_assessment_session_update_attempt_multiple_responses_succeeds(self):
        timestamp = local_now()

        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            item=self.item,
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "test"},
                        "correct": 1,
                        "time_spent": 10,
                        "replace": True,
                    },
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "testwrong"},
                        "correct": 0,
                        "time_spent": 20,
                        "replace": True,
                    },
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 0)
        self.assertEqual(attempt.answer, {"response": "testwrong"})
        self.assertEqual(attempt.time_spent, 20)
        self.assertEqual(attempt.interaction_history[0], hinteraction)
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.ANSWER,
                "answer": {"response": "test"},
                "correct": 1.0,
            },
        )
        self.assertEqual(
            attempt.interaction_history[2],
            {
                "type": interaction_types.ANSWER,
                "answer": {"response": "testwrong"},
                "correct": 0,
            },
        )

    def test_update_assessment_session_update_attempt_no_replace_succeeds(self):
        timestamp = local_now()

        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            answer=hinteraction["answer"],
            item=self.item,
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "test"},
                        "correct": 1,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 0)
        self.assertEqual(attempt.answer, hinteraction["answer"])
        self.assertEqual(attempt.time_spent, 10)
        self.assertEqual(attempt.interaction_history[0], hinteraction)
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.ANSWER,
                "answer": {"response": "test"},
                "correct": 1.0,
            },
        )

    def test_update_assessment_session_update_attempt_no_replace_multiple_responses_succeeds(
        self,
    ):
        timestamp = local_now()

        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            answer=hinteraction["answer"],
            item=self.item,
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "test"},
                        "correct": 1,
                        "time_spent": 20,
                    },
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "testwrong"},
                        "correct": 0.5,
                        "time_spent": 30,
                    },
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 0)
        self.assertEqual(attempt.answer, hinteraction["answer"])
        self.assertEqual(attempt.time_spent, 30)
        self.assertEqual(attempt.interaction_history[0], hinteraction)
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.ANSWER,
                "answer": {"response": "test"},
                "correct": 1.0,
            },
        )
        self.assertEqual(
            attempt.interaction_history[2],
            {
                "type": interaction_types.ANSWER,
                "answer": {"response": "testwrong"},
                "correct": 0.5,
            },
        )

    def test_update_assessment_session_update_attempt_hinted_succeeds(self):
        timestamp = local_now()
        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            item=self.item,
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "hinty mchintyson2"},
                        "hinted": True,
                        "correct": 0,
                        "time_spent": 10,
                        "replace": True,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 0)
        self.assertEqual(attempt.answer, {"response": "hinty mchintyson2"})
        self.assertEqual(attempt.time_spent, 10)
        self.assertEqual(attempt.interaction_history[0], hinteraction)
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.HINT,
                "answer": {"response": "hinty mchintyson2"},
            },
        )

    def test_update_assessment_session_update_attempt_hinted_previously_correct_succeeds(
        self,
    ):
        timestamp = local_now()
        interaction = {
            "type": interaction_types.ANSWER,
            "answer": {"response": "nohinty"},
            "correct": 1.0,
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=1,
            item=self.item,
            answer=interaction["answer"],
            user=self.user,
            interaction_history=[interaction],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "hinty mchintyson"},
                        "hinted": True,
                        "correct": 0,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.answer, interaction["answer"])
        self.assertEqual(attempt.time_spent, 10)
        self.assertEqual(attempt.interaction_history[0], interaction)
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.HINT,
                "answer": {"response": "hinty mchintyson"},
            },
        )

    def test_update_assessment_session_update_attempt_errored_succeeds(self):
        timestamp = local_now()
        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            item=self.item,
            user=self.user,
            interaction_history=[hinteraction],
            answer=hinteraction["answer"],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "error": True,
                        "correct": 0,
                        "time_spent": 10,
                        "replace": True,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 0)
        self.assertEqual(attempt.answer, {"response": "hinty mchintyson"})
        self.assertEqual(attempt.time_spent, 10)
        self.assertEqual(attempt.interaction_history[0], hinteraction)
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.ERROR,
            },
        )


class ProgressTrackingViewSetAnonymousUpdateSessionAssessmentTestCase(
    ProgressTrackingViewSetUpdateSessionAssessmentBase, APITestCase
):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()

        self.channel_id = uuid.uuid4().hex
        self.content_id = uuid.uuid4().hex

        self.node = ContentNode.objects.create(
            channel_id=self.channel_id,
            content_id=self.content_id,
            id=uuid.uuid4().hex,
            kind=content_kinds.EXERCISE,
        )
        mastery_model = {"type": exercises.M_OF_N, "m": 8, "n": 10}
        AssessmentMetaData.objects.create(
            mastery_model=mastery_model,
            contentnode=self.node,
            id=uuid.uuid4().hex,
            number_of_assessments=20,
        )

        self.item = "test_item_id"

        self.session_log = ContentSessionLog.objects.create(
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
            extra_fields={"context": {"node_id": self.node.id}},
        )

        self.mastery_level = None
        self.mastery_log = None
        self.user = None


class ProgressTrackingViewSetLoggedInUpdateSessionAssessmentTestCase(
    ProgressTrackingViewSetUpdateSessionAssessmentBase, APITestCase
):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.channel_id = uuid.uuid4().hex
        self.content_id = uuid.uuid4().hex

        self.node = ContentNode.objects.create(
            channel_id=self.channel_id, content_id=self.content_id, id=uuid.uuid4().hex
        )
        mastery_model = {"type": exercises.M_OF_N, "m": 8, "n": 10}
        AssessmentMetaData.objects.create(
            mastery_model=mastery_model,
            contentnode=self.node,
            id=uuid.uuid4().hex,
            number_of_assessments=20,
        )

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
            extra_fields={"context": {"node_id": self.node.id, "mastery_level": 1}},
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
        )

        self.item = "test_item_id"

        self.mastery_log = MasteryLog.objects.create(
            mastery_criterion=mastery_model,
            summarylog=self.summary_log,
            start_timestamp=self.summary_log.start_timestamp,
            user=self.user,
            mastery_level=1,
        )
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    @property
    def mastery_level(self):
        return self.mastery_log.mastery_level

    def test_update_assessment_session_create_attempt_in_lesson_succeeds(self):
        lesson = create_assigned_lesson_for_user(self.user)
        lesson_id = lesson.id
        self.session_log.extra_fields = {
            "context": {
                "lesson_id": lesson_id,
                "node_id": self.node.id,
                "mastery_level": self.mastery_level,
            }
        }
        self.session_log.save()
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self._make_request(
                {
                    "interactions": [
                        {
                            "item": self.item,
                            "answer": {"response": "test"},
                            "correct": 1.0,
                            "time_spent": 10,
                        }
                    ],
                }
            )
            save_queue_mock.assert_called()
            self.assertEqual(save_queue_mock.mock_calls[0][1][0], parse_attemptslog)
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], AttemptLog))

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.answer, {"response": "test"})
        self.assertEqual(attempt.time_spent, 10)

    def test_update_assessment_session_update_attempt_in_lesson_succeeds(self):
        timestamp = local_now()
        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            item="test_item_id",
            user=self.user,
            interaction_history=[hinteraction],
        )
        lesson = create_assigned_lesson_for_user(self.user)
        lesson_id = lesson.id
        self.session_log.extra_fields = {
            "context": {
                "lesson_id": lesson_id,
                "node_id": self.node.id,
                "mastery_level": self.mastery_level,
            }
        }
        self.session_log.save()
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self._make_request(
                {
                    "interactions": [
                        {
                            "id": attemptlog.id,
                            "item": self.item,
                            "answer": {"response": "test"},
                            "correct": 1,
                            "time_spent": 10,
                            "replace": True,
                        }
                    ],
                }
            )
            save_queue_mock.assert_called()
            self.assertEqual(save_queue_mock.mock_calls[0][1][0], parse_attemptslog)
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], AttemptLog))

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempts", [{}])[0].get("id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.answer, {"response": "test"})
        self.assertEqual(attempt.time_spent, 10)
        self.assertEqual(attempt.interaction_history[0], hinteraction)
        self.assertEqual(
            attempt.interaction_history[1],
            {
                "type": interaction_types.ANSWER,
                "answer": {"response": "test"},
                "correct": 1.0,
            },
        )

    def tearDown(self):
        self.client.logout()


class ProgressTrackingViewSetLoggedInUpdateSessionCoachQuizTestCase(
    ProgressTrackingViewSetUpdateSessionAssessmentBase, APITestCase
):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.quiz = create_assigned_quiz_for_user(self.user)

        self.content_id = self.quiz.id
        self.node_id = uuid.uuid4().hex

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
            extra_fields={"context": {"quiz_id": self.quiz.id, "mastery_level": -1}},
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
        )

        self.mastery_log = MasteryLog.objects.create(
            mastery_criterion={"type": "quiz", "coach_assigned": True},
            summarylog=self.summary_log,
            start_timestamp=self.summary_log.start_timestamp,
            user=self.user,
            mastery_level=-1,
        )
        self.item = "{}:{}".format(self.node_id, "test_item_id")

        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    @property
    def mastery_level(self):
        return self.mastery_log.mastery_level

    def _make_request(self, data):
        data["quiz_id"] = self.content_id
        return self.client.put(
            reverse(
                "kolibri:core:trackprogress-detail", kwargs={"pk": self.session_log.id}
            ),
            data=data,
            format="json",
        )

    def test_update_assessment_session_create_attempt_succeeds(self):
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            super(
                ProgressTrackingViewSetLoggedInUpdateSessionCoachQuizTestCase, self
            ).test_update_assessment_session_create_attempt_succeeds()
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], quiz_answered_notification
            )
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], AttemptLog))
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][2], string_types)
            )

    def test_update_assessment_session_create_errored_attempt_succeeds(self):
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            super(
                ProgressTrackingViewSetLoggedInUpdateSessionCoachQuizTestCase, self
            ).test_update_assessment_session_create_errored_attempt_succeeds()
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], quiz_answered_notification
            )
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], AttemptLog))
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][2], string_types)
            )

    def test_update_assessment_session_create_hinted_attempt_succeeds(self):
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            super(
                ProgressTrackingViewSetLoggedInUpdateSessionCoachQuizTestCase, self
            ).test_update_assessment_session_create_hinted_attempt_succeeds()
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], quiz_answered_notification
            )
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], AttemptLog))
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][2], string_types)
            )

    def test_update_session_absolute_progress_triggers_completion(self):
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            self.summary_log.progress = 0.3
            self.summary_log.save()
            response = self.client.put(
                reverse(
                    "kolibri:core:trackprogress-detail",
                    kwargs={"pk": self.session_log.id},
                ),
                data={
                    "progress": 1.0,
                },
                format="json",
            )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["complete"], True)
            log = ContentSummaryLog.objects.get()
            self.assertEqual(1.0, log.progress)
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], quiz_completed_notification
            )
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], MasteryLog))
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][2], string_types)
            )

    def test_update_assessment_session_update_attempt_submitted_quiz_fails(self):
        timestamp = local_now()
        self.mastery_log.complete = True
        self.mastery_log.save()

        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            item="test_item_id",
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "test"},
                        "correct": 1,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 403)

    def test_update_assessment_session_update_attempt_closed_quiz_fails(self):
        timestamp = local_now()
        self.quiz.active = False
        self.quiz.save()

        hinteraction = {
            "type": interaction_types.HINT,
            "answer": {"response": "hinty mchintyson"},
        }
        attemptlog = AttemptLog.objects.create(
            masterylog=self.mastery_log,
            sessionlog=self.session_log,
            start_timestamp=timestamp,
            end_timestamp=timestamp,
            correct=0,
            item="test_item_id",
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "interactions": [
                    {
                        "id": attemptlog.id,
                        "item": self.item,
                        "answer": {"response": "test"},
                        "correct": 1,
                        "time_spent": 10,
                    }
                ],
            }
        )

        self.assertEqual(response.status_code, 403)

    def tearDown(self):
        self.client.logout()
