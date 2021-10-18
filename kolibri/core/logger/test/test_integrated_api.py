# -*- coding: utf-8 -*-
"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import uuid

from django.core.urlresolvers import reverse
from django.http.cookie import SimpleCookie
from le_utils.constants import exercises
from mock import patch
from rest_framework.test import APITestCase
from six import string_types

from ..models import AttemptLog
from ..models import ContentSessionLog
from ..models import ContentSummaryLog
from ..models import MasteryLog
from .factory_logger import FacilityUserFactory
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import DUMMY_PASSWORD
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.content.models import AssessmentMetaData
from kolibri.core.content.models import ContentNode
from kolibri.core.logger.constants import interaction_types
from kolibri.core.notifications.api import finish_lesson_resource
from kolibri.core.notifications.api import quiz_answered_notification
from kolibri.core.notifications.api import quiz_completed_notification
from kolibri.core.notifications.api import quiz_started_notification
from kolibri.core.notifications.api import start_lesson_assessment
from kolibri.core.notifications.api import start_lesson_resource
from kolibri.core.notifications.api import update_lesson_assessment
from kolibri.utils.time_utils import local_now


class ProgressTrackingViewSetStartSessionFreshTestCase(APITestCase):
    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user = FacilityUserFactory.create(facility=self.facility)

        self.channel_id = uuid.uuid4().hex
        self.content_id = uuid.uuid4().hex

    def _make_request(self, data):
        post_data = {
            "content_id": self.content_id,
            "kind": "video",
            "context": {"channel_id": self.channel_id},
        }
        post_data.update(data)
        return self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

    def test_assessment_flag_required(self):
        response = self._make_request({})
        self.assertEqual(response.status_code, 400)

    def test_start_timestamp_required(self):
        response = self._make_request(
            {"assessment": False, "channel_id": self.channel_id}
        )
        self.assertEqual(response.status_code, 400)

    def test_start_session_anonymous_succeeds(self):
        timestamp = local_now()
        self.client.cookies = SimpleCookie({"visitor_id": uuid.uuid4().hex})
        response = self._make_request(
            {
                "assessment": False,
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertIsNotNone(log.visitor_id)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 0)

    def test_start_session_logged_in_succeeds(self):
        timestamp = local_now()
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self._make_request(
            {
                "assessment": False,
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)

    def test_start_session_logged_in_lesson_succeeds(self):
        timestamp = local_now()
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        lesson_id = uuid.uuid4().hex
        node_id = uuid.uuid4().hex
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self._make_request(
                {
                    "assessment": False,
                    "start_timestamp": timestamp,
                    "context": {"lesson_id": lesson_id, "node_id": node_id},
                }
            )
            save_queue_mock.assert_called()
            self.assertEqual(save_queue_mock.mock_calls[0][1][0], start_lesson_resource)
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][1], ContentSummaryLog)
            )
            self.assertEqual(save_queue_mock.mock_calls[0][1][2], node_id)
            self.assertEqual(save_queue_mock.mock_calls[0][1][3], lesson_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertIsNone(log.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertIsNone(log.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)

    def test_start_assessment_session_anonymous_succeeds(self):
        timestamp = local_now()
        response = self._make_request(
            {
                "assessment": True,
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 0)

    def test_start_assessment_session_logged_in_no_mastery_model_fails(self):
        timestamp = local_now()
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self._make_request(
            {
                "assessment": True,
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_start_assessment_session_logged_in_succeeds(self):
        timestamp = local_now()
        node = ContentNode.objects.create(
            channel_id=self.channel_id, content_id=self.content_id, id=uuid.uuid4()
        )
        mastery_model = {"type": exercises.M_OF_N, "m": 8, "n": 10}
        AssessmentMetaData.objects.create(
            mastery_model=mastery_model,
            contentnode=node,
            id=uuid.uuid4(),
            number_of_assessments=20,
        )
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self._make_request(
            {
                "assessment": True,
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mastery_criterion"], mastery_model)
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, self.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = MasteryLog.objects.get()
        self.assertEqual(log.mastery_criterion, mastery_model)

    def test_start_assessment_session_logged_in_coach_assigned_wrong_kind_fails(self):
        timestamp = local_now()
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        post_data = {
            "content_id": self.content_id,
            "assessment": True,
            "kind": "exercise",
            "start_timestamp": timestamp,
            "context": {"quiz_id": self.channel_id},
        }
        response = self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_start_assessment_session_logged_in_coach_assigned_succeeds(self):
        timestamp = local_now()
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        post_data = {
            "content_id": self.content_id,
            "assessment": True,
            "kind": "quiz",
            "start_timestamp": timestamp,
            "context": {"quiz_id": self.channel_id},
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
        self.assertEqual(response.json()["mastery_criterion"], {"type": "quiz"})
        self.assertEqual(ContentSessionLog.objects.all().count(), 1)
        log = ContentSessionLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertIsNone(log.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertIsNone(log.channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = MasteryLog.objects.get()
        self.assertEqual(log.mastery_criterion, {"type": "quiz"})

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

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
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
        post_data = {"content_id": self.content_id, "kind": "video"}
        post_data.update(data)
        return self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

    def test_start_session_logged_in_succeeds(self):
        timestamp = local_now()
        new_channel_id = uuid.uuid4().hex
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self._make_request(
            {
                "assessment": False,
                "context": {"channel_id": new_channel_id},
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(ContentSessionLog.objects.all().count(), 2)
        log = ContentSessionLog.objects.filter(channel_id=new_channel_id).get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, new_channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        self.summary_log.refresh_from_db()
        log = self.summary_log
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, new_channel_id)
        self.assertNotEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)

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
            channel_id=self.channel_id, content_id=self.content_id, id=uuid.uuid4()
        )
        self.mastery_model = {"type": exercises.M_OF_N, "m": 8, "n": 10}
        self.assessmentmetadata = AssessmentMetaData.objects.create(
            mastery_model=self.mastery_model,
            contentnode=self.node,
            id=uuid.uuid4(),
            number_of_assessments=20,
        )

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
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
        post_data = {"content_id": self.content_id, "kind": "exercise"}
        post_data.update(data)
        return self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

    def test_start_assessment_session_logged_in_succeeds(self):
        timestamp = local_now()
        new_channel_id = uuid.uuid4().hex
        response = self._make_request(
            {
                "assessment": True,
                "context": {"channel_id": new_channel_id},
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mastery_criterion"], self.mastery_model)
        self.assertEqual(ContentSessionLog.objects.all().count(), 2)
        log = ContentSessionLog.objects.filter(channel_id=new_channel_id).get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, new_channel_id)
        self.assertEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(log.content_id, self.content_id)
        self.assertEqual(log.channel_id, new_channel_id)
        self.assertNotEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)
        log = MasteryLog.objects.get()
        self.assertEqual(log.mastery_criterion, self.mastery_model)

    def test_start_assessment_session_logged_in_changed_mastery_model_succeeds(self):
        timestamp = local_now()
        new_channel_id = uuid.uuid4().hex
        self.assessmentmetadata.mastery_model = {
            "type": exercises.M_OF_N,
            "m": 9,
            "n": 10,
        }
        self.assessmentmetadata.save()
        response = self._make_request(
            {
                "assessment": True,
                "context": {"channel_id": new_channel_id},
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["mastery_criterion"], self.mastery_model)
        log = MasteryLog.objects.get()
        self.assertEqual(log.mastery_criterion, self.mastery_model)

    def test_start_assessment_session_logged_in_completed_no_new(self):
        timestamp = local_now()
        self.mastery_log.complete = True
        self.mastery_log.save()
        new_channel_id = uuid.uuid4().hex
        response = self._make_request(
            {
                "assessment": True,
                "context": {"channel_id": new_channel_id},
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(MasteryLog.objects.all().count(), 1)

    def test_start_assessment_session_logged_in_completed_repeat_new(self):
        timestamp = local_now()
        self.mastery_log.complete = True
        self.mastery_log.save()
        new_channel_id = uuid.uuid4().hex
        response = self._make_request(
            {
                "assessment": True,
                "context": {"channel_id": new_channel_id},
                "start_timestamp": timestamp,
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
        response = self._make_request(
            {
                "assessment": True,
                "context": {"channel_id": self.channel_id},
                "start_timestamp": timestamp,
            }
        )

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
        response = self._make_request(
            {
                "assessment": True,
                "context": {"channel_id": self.channel_id},
                "start_timestamp": timestamp,
            }
        )

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
        response = self._make_request(
            {
                "assessment": True,
                "context": {"channel_id": self.channel_id},
                "start_timestamp": timestamp,
            }
        )

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
        self.mastery_log.mastery_criterion = {"type": "quiz"}
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
        response = self._make_request(
            {
                "assessment": True,
                "context": {"channel_id": self.channel_id},
                "start_timestamp": timestamp,
            }
        )

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

        self.content_id = uuid.uuid4().hex

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="quiz",
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="quiz",
        )

        self.mastery_log = MasteryLog.objects.create(
            mastery_criterion={"type": "quiz"},
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
        post_data = {"content_id": self.content_id, "kind": "quiz"}
        post_data.update(data)
        return self.client.post(
            reverse("kolibri:core:trackprogress-list"),
            data=post_data,
            format="json",
        )

    def test_start_assessment_session_logged_in_succeeds(self):
        timestamp = local_now()
        response = self._make_request(
            {
                "assessment": True,
                "context": {"quiz_id": self.content_id},
                "start_timestamp": timestamp,
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
        self.assertNotEqual(timestamp, log.start_timestamp)
        self.assertEqual(timestamp, log.end_timestamp)
        self.assertEqual(ContentSummaryLog.objects.all().count(), 1)

    def test_start_assessment_session_logged_in_completed_no_new(self):
        timestamp = local_now()
        self.mastery_log.complete = True
        self.mastery_log.save()
        response = self._make_request(
            {
                "assessment": True,
                "context": {"quiz_id": self.content_id},
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(MasteryLog.objects.all().count(), 1)

    def test_start_assessment_session_logged_in_completed_repeat_new(self):
        timestamp = local_now()
        self.mastery_log.complete = True
        self.mastery_log.save()
        response = self._make_request(
            {
                "assessment": True,
                "context": {"quiz_id": self.content_id},
                "start_timestamp": timestamp,
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
        self.mastery_log.mastery_criterion = {"type": "quiz"}
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
                "assessment": True,
                "context": {"quiz_id": self.content_id},
                "start_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["totalattempts"], 15)
        self.assertEqual(len(response.json()["pastattempts"]), 15)
        for attempt in response.json()["pastattempts"]:
            self.assertEqual(attempt["item"], "test_item_id")
            self.assertTrue(0 <= int(attempt["content_id"]) < 15)

    def tearDown(self):
        self.client.logout()


class UpdateSessionBase(object):
    def _make_request(self, data):
        return self.client.put(
            reverse(
                "kolibri:core:trackprogress-detail", kwargs={"pk": self.session_log.id}
            ),
            data=data,
            format="json",
        )

    def test_end_timestamp_required(self):
        response = self._make_request({})
        self.assertEqual(response.status_code, 400)

    def test_update_session_succeeds(self):
        timestamp = local_now()
        response = self._make_request(
            {
                "end_timestamp": timestamp,
            }
        )

        self.assertEqual(response.status_code, 200)
        self._assert_logs_value("end_timestamp", timestamp)

    def test_update_session_progress_delta_succeeds(self):
        timestamp = local_now()
        self._update_logs("progress", 0.1)
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "progress_delta": 0.1,
            }
        )

        self.assertEqual(response.status_code, 200)
        self._assert_logs_value("progress", 0.2)

    def test_update_session_progress_delta_overflow_succeeds(self):
        timestamp = local_now()
        self._update_logs("progress", 0.9)
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "progress_delta": 0.9,
            }
        )

        self.assertEqual(response.status_code, 200)
        self._assert_logs_value("progress", 1.0)

    def test_update_session_absolute_progress_succeeds(self):
        timestamp = local_now()
        self._update_logs("progress", 0.3)
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "progress": 0.1,
            }
        )

        self.assertEqual(response.status_code, 200)
        self._assert_logs_value("progress", 0.1)

    def test_update_session_absolute_progress_and_progress_delta_fails(self):
        timestamp = local_now()
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "progress": 0.1,
                "progress_delta": 0.1,
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_session_time_spent_delta(self):
        timestamp = local_now()
        self._update_logs("time_spent", 30)
        response = self._make_request(
            {
                "end_timestamp": timestamp,
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

        self.session_log = ContentSessionLog.objects.create(
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
        )

    def _update_logs(self, field, value):
        setattr(self.session_log, field, value)
        self.session_log.save()

    def _assert_logs_value(self, field, value):
        self.session_log.refresh_from_db()
        self.assertEqual(getattr(self.session_log, field), value)

    def test_update_session_absolute_progress_triggers_completion(self):
        timestamp = local_now()
        self._update_logs("progress", 0.3)
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "progress": 1.0,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)

    def test_update_session_progress_delta_triggers_completion(self):
        timestamp = local_now()
        self._update_logs("progress", 0.9)
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "progress_delta": 0.1,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)

    def test_wrong_user_session_404(self):
        timestamp = local_now()
        user = FacilityUserFactory.create(facility=self.facility)
        session_log = ContentSessionLog.objects.create(
            user=user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
        )
        response = self.client.put(
            reverse("kolibri:core:trackprogress-detail", kwargs={"pk": session_log.id}),
            data={
                "end_timestamp": timestamp,
            },
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

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
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
        timestamp = local_now()
        self._update_logs("progress", 0.3)
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "progress": 1.0,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(1.0, log.progress)
        self.assertEqual(timestamp, log.completion_timestamp)

    def test_update_session_absolute_progress_in_lesson_triggers_completion(self):
        timestamp = local_now()
        self._update_logs("progress", 0.3)
        lesson_id = uuid.uuid4().hex
        node_id = uuid.uuid4().hex
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self._make_request(
                {
                    "end_timestamp": timestamp,
                    "progress": 1.0,
                    "context": {"lesson_id": lesson_id, "node_id": node_id},
                }
            )
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], finish_lesson_resource
            )
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][1], ContentSummaryLog)
            )
            self.assertEqual(save_queue_mock.mock_calls[0][1][2], node_id)
            self.assertEqual(save_queue_mock.mock_calls[0][1][3], lesson_id)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(1.0, log.progress)
        self.assertEqual(timestamp, log.completion_timestamp)

    def test_update_session_progress_delta_triggers_completion(self):
        timestamp = local_now()
        self._update_logs("progress", 0.9)
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "progress_delta": 0.1,
            }
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["complete"], True)
        log = ContentSummaryLog.objects.get()
        self.assertEqual(1.0, log.progress)
        self.assertEqual(timestamp, log.completion_timestamp)

    def test_anonymous_user_session_404(self):
        timestamp = local_now()
        session_log = ContentSessionLog.objects.create(
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
        )
        response = self.client.put(
            reverse("kolibri:core:trackprogress-detail", kwargs={"pk": session_log.id}),
            data={
                "end_timestamp": timestamp,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_wrong_user_session_404(self):
        timestamp = local_now()
        user = FacilityUserFactory.create(facility=self.facility)
        session_log = ContentSessionLog.objects.create(
            user=user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="video",
        )
        response = self.client.put(
            reverse("kolibri:core:trackprogress-detail", kwargs={"pk": session_log.id}),
            data={
                "end_timestamp": timestamp,
            },
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
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "start_timestamp": timestamp,
                    "answer": {"response": "test"},
                    "correct": 1.0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_session_no_start_timestamp_fails(self):
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "item_id": self.item_id,
                    "answer": {"response": "test"},
                    "correct": 1.0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_session_no_answer_non_error_fails(self):
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "item_id": self.item_id,
                    "start_timestamp": timestamp,
                    "correct": 1.0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_no_correct_fails(self):
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "item_id": self.item_id,
                    "start_timestamp": timestamp,
                    "answer": {"response": "test"},
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_no_time_spent_fails(self):
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "item_id": self.item_id,
                    "start_timestamp": timestamp,
                    "answer": {"response": "test"},
                    "correct": 1.0,
                },
            }
        )

        self.assertEqual(response.status_code, 400)

    def test_update_assessment_session_create_attempt_succeeds(self):
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "item_id": self.item_id,
                    "start_timestamp": timestamp,
                    "answer": {"response": "test"},
                    "correct": 1.0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempt_id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.start_timestamp, timestamp)
        self.assertEqual(attempt.end_timestamp, timestamp)
        self.assertEqual(attempt.answer, {"response": "test"})
        self.assertEqual(attempt.time_spent, 10)

    def test_update_assessment_session_create_errored_attempt_succeeds(self):
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "item_id": self.item_id,
                    "start_timestamp": timestamp,
                    "error": True,
                    "correct": 1.0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempt_id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.start_timestamp, timestamp)
        self.assertEqual(attempt.end_timestamp, timestamp)
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
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "item_id": self.item_id,
                    "start_timestamp": timestamp,
                    "hinted": True,
                    "answer": {"response": "hinty mchintyson"},
                    "correct": 1.0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempt_id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.start_timestamp, timestamp)
        self.assertEqual(attempt.end_timestamp, timestamp)
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
            item="test_item_id",
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "attempt_id": attemptlog.id,
                    "answer": {"response": "test"},
                    "correct": 1,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempt_id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.start_timestamp, timestamp)
        self.assertEqual(attempt.end_timestamp, timestamp)
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
            item="test_item_id",
            user=self.user,
            interaction_history=[hinteraction],
        )
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "attempt_id": attemptlog.id,
                    "answer": {"response": "hinty mchintyson2"},
                    "hinted": True,
                    "correct": 0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempt_id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 0)
        self.assertEqual(attempt.start_timestamp, timestamp)
        self.assertEqual(attempt.end_timestamp, timestamp)
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
            item="test_item_id",
            user=self.user,
            interaction_history=[hinteraction],
            answer=hinteraction["answer"],
        )
        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "mastery_level": self.mastery_level,
                "attempt": {
                    "attempt_id": attemptlog.id,
                    "error": True,
                    "correct": 0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempt_id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 0)
        self.assertEqual(attempt.start_timestamp, timestamp)
        self.assertEqual(attempt.end_timestamp, timestamp)
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
            channel_id=self.channel_id, content_id=self.content_id, id=uuid.uuid4()
        )
        mastery_model = {"type": exercises.M_OF_N, "m": 8, "n": 10}
        AssessmentMetaData.objects.create(
            mastery_model=mastery_model,
            contentnode=self.node,
            id=uuid.uuid4(),
            number_of_assessments=20,
        )

        self.item_id = "test_item_id"
        self.item = self.item_id

        self.session_log = ContentSessionLog.objects.create(
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
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
            channel_id=self.channel_id, content_id=self.content_id, id=uuid.uuid4()
        )
        mastery_model = {"type": exercises.M_OF_N, "m": 8, "n": 10}
        AssessmentMetaData.objects.create(
            mastery_model=mastery_model,
            contentnode=self.node,
            id=uuid.uuid4(),
            number_of_assessments=20,
        )

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            channel_id=self.channel_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
        )

        self.item_id = "test_item_id"
        self.item = self.item_id

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
        timestamp = local_now()
        lesson_id = uuid.uuid4().hex
        node_id = uuid.uuid4().hex
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self._make_request(
                {
                    "end_timestamp": timestamp,
                    "mastery_level": self.mastery_level,
                    "context": {"lesson_id": lesson_id, "node_id": node_id},
                    "attempt": {
                        "item_id": self.item_id,
                        "start_timestamp": timestamp,
                        "answer": {"response": "test"},
                        "correct": 1.0,
                        "time_spent": 10,
                    },
                }
            )
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], start_lesson_assessment
            )
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], AttemptLog))
            self.assertEqual(save_queue_mock.mock_calls[0][1][2], node_id)
            self.assertEqual(save_queue_mock.mock_calls[0][1][3], lesson_id)

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempt_id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Attempt not created")
        self.assertEqual(attempt.item, self.item)
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.start_timestamp, timestamp)
        self.assertEqual(attempt.end_timestamp, timestamp)
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
        lesson_id = uuid.uuid4().hex
        node_id = uuid.uuid4().hex
        with patch("kolibri.core.logger.api.wrap_to_save_queue") as save_queue_mock:
            response = self._make_request(
                {
                    "end_timestamp": timestamp,
                    "mastery_level": self.mastery_level,
                    "context": {"lesson_id": lesson_id, "node_id": node_id},
                    "attempt": {
                        "attempt_id": attemptlog.id,
                        "answer": {"response": "test"},
                        "correct": 1,
                        "time_spent": 10,
                    },
                }
            )
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], update_lesson_assessment
            )
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], AttemptLog))
            self.assertEqual(save_queue_mock.mock_calls[0][1][2], node_id)
            self.assertEqual(save_queue_mock.mock_calls[0][1][3], lesson_id)

        self.assertEqual(response.status_code, 200)
        attempt_id = response.json().get("attempt_id")
        self.assertIsNotNone(attempt_id)
        try:
            attempt = AttemptLog.objects.get(id=attempt_id)
        except AttemptLog.DoesNotExist:
            self.fail("Nonexistent attempt_id returned")
        self.assertEqual(attempt.correct, 1.0)
        self.assertEqual(attempt.start_timestamp, timestamp)
        self.assertEqual(attempt.end_timestamp, timestamp)
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

    def test_update_assessment_session_no_mastery_level_fails(self):
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "attempt": {
                    "item_id": self.item_id,
                    "start_timestamp": timestamp,
                    "answer": {"response": "test"},
                    "correct": 1.0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 400)

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

        self.content_id = uuid.uuid4().hex
        self.node_id = uuid.uuid4().hex

        self.session_log = ContentSessionLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
        )
        self.summary_log = ContentSummaryLog.objects.create(
            user=self.user,
            content_id=self.content_id,
            start_timestamp=local_now(),
            end_timestamp=local_now(),
            kind="exercise",
        )

        self.mastery_log = MasteryLog.objects.create(
            mastery_criterion={"type": "quiz"},
            summarylog=self.summary_log,
            start_timestamp=self.summary_log.start_timestamp,
            user=self.user,
            mastery_level=-1,
        )
        self.item_id = "test_item_id"
        self.item = "{}:{}".format(self.node_id, self.item_id)

        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    @property
    def mastery_level(self):
        return self.mastery_log.mastery_level

    def _make_request(self, data):
        data["context"] = {"quiz_id": self.content_id}
        data["attempt"]["content_id"] = self.node_id
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
            timestamp = local_now()
            self.summary_log.progress = 0.3
            self.summary_log.save()
            response = self.client.put(
                reverse(
                    "kolibri:core:trackprogress-detail",
                    kwargs={"pk": self.session_log.id},
                ),
                data={
                    "mastery_level": self.mastery_level,
                    "context": {"quiz_id": self.content_id},
                    "end_timestamp": timestamp,
                    "progress": 1.0,
                },
                format="json",
            )

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["complete"], True)
            log = ContentSummaryLog.objects.get()
            self.assertEqual(1.0, log.progress)
            self.assertEqual(timestamp, log.completion_timestamp)
            save_queue_mock.assert_called()
            self.assertEqual(
                save_queue_mock.mock_calls[0][1][0], quiz_completed_notification
            )
            self.assertTrue(isinstance(save_queue_mock.mock_calls[0][1][1], MasteryLog))
            self.assertTrue(
                isinstance(save_queue_mock.mock_calls[0][1][2], string_types)
            )

    def test_update_assessment_session_no_mastery_level_fails(self):
        timestamp = local_now()

        response = self._make_request(
            {
                "end_timestamp": timestamp,
                "attempt": {
                    "item_id": "test_item_id",
                    "start_timestamp": timestamp,
                    "answer": {"response": "test"},
                    "correct": 1.0,
                    "time_spent": 10,
                },
            }
        )

        self.assertEqual(response.status_code, 400)

    def tearDown(self):
        self.client.logout()
