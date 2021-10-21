# -*- coding: utf-8 -*-
"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""
import csv
import datetime
import sys
import tempfile
import uuid

from django.core.management import call_command
from django.core.urlresolvers import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from ..models import ContentSessionLog
from ..models import ContentSummaryLog
from ..serializers import ExamLogSerializer
from .factory_logger import ContentSessionLogFactory
from .factory_logger import ContentSummaryLogFactory
from .factory_logger import FacilityUserFactory
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import ClassroomFactory
from kolibri.core.auth.test.test_api import DUMMY_PASSWORD
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import LearnerGroupFactory
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.exams.models import Exam
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog


class ContentSummaryLogCSVExportTestCase(APITestCase):

    fixtures = ["content_test.json"]

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.summary_logs = [
            ContentSummaryLogFactory.create(
                user=cls.user1,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )
            for _ in range(3)
        ]
        cls.facility.add_admin(cls.admin)

    def test_csv_download(self):
        expected_count = ContentSummaryLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="summary", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_deleted_content(self):
        expected_count = ContentSummaryLog.objects.count()
        ContentNode.objects.all().delete()
        ChannelMetadata.objects.all().delete()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="summary", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_unicode_username(self):
        user = FacilityUserFactory.create(
            facility=self.facility, username="كوليبري", full_name="كوليبري"
        )
        for _ in range(3):
            ContentSummaryLogFactory.create(
                user=user,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )

        expected_count = ContentSummaryLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="summary", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)


class ContentSessionLogCSVExportTestCase(APITestCase):

    fixtures = ["content_test.json"]

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)
        cls.interaction_logs = [
            ContentSessionLogFactory.create(
                user=cls.user,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )
            for _ in range(3)
        ]
        cls.facility.add_admin(cls.admin)

    def test_csv_download(self):
        expected_count = ContentSessionLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="session", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_deleted_content(self):
        expected_count = ContentSessionLog.objects.count()
        ContentNode.objects.all().delete()
        ChannelMetadata.objects.all().delete()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="session", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_unicode_username(self):
        user = FacilityUserFactory.create(
            facility=self.facility, username="كوليبري", full_name="كوليبري"
        )
        for _ in range(3):
            ContentSessionLogFactory.create(
                user=user,
                content_id=uuid.uuid4().hex,
                channel_id="6199dde695db4ee4ab392222d5af1e5c",
            )

        expected_count = ContentSessionLog.objects.count()
        _, filepath = tempfile.mkstemp(suffix=".csv")
        call_command(
            "exportlogs", log_type="session", output_file=filepath, overwrite=True
        )
        if sys.version_info[0] < 3:
            csv_file = open(filepath, "rb")
        else:
            csv_file = open(filepath, "r", newline="")
        with csv_file as f:
            results = list(csv.reader(f))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)


class ExamAttemptLogAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility)
        cls.exam = Exam.objects.create(
            title="",
            question_count=1,
            collection=cls.facility,
            creator=cls.user2,
            active=True,
        )
        cls.examlog = ExamLog.objects.create(exam=cls.exam, user=cls.user1)
        [
            ExamAttemptLog.objects.create(
                item="d4623921a2ef5ddaa39048c0f7a6fe06",
                examlog=cls.examlog,
                user=cls.user1,
                content_id=uuid.uuid4().hex,
                start_timestamp=str(
                    datetime.datetime.now().replace(minute=x, hour=x, second=x)
                ),
                end_timestamp=str(
                    datetime.datetime.now().replace(minute=x, hour=x, second=x)
                ),
                correct=0,
            )
            for x in range(3)
        ]

        cls.examattemptdata = {
            "item": "test",
            "start_timestamp": timezone.now(),
            "end_timestamp": timezone.now(),
            "correct": 0,
            "user": cls.user1.pk,
            "examlog": cls.examlog.pk,
            "content_id": "77b57a14a1f0466bb27ea7de8ff468be",
            "channel_id": "77b57a14a1f0466bb27ea7de8ff468be",
        }

    def setUp(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def tearDown(self):
        self.client.logout()

    def test_exam_not_active_permissions(self):
        self.exam.active = False
        self.exam.save()
        response = self.client.post(
            reverse("kolibri:core:examattemptlog-list"),
            data=self.examattemptdata,
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_examlog_closed_permissions(self):
        self.examlog.closed = True
        self.examlog.save()
        response = self.client.post(
            reverse("kolibri:core:examattemptlog-list"),
            data=self.examattemptdata,
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_examlog_attempt_get_progress(self):
        exam_attempt_log_data = ExamLogSerializer(self.examlog).data
        self.assertEqual(exam_attempt_log_data["progress"], 1)

    def test_exam_not_active_patch_permissions(self):
        # Regression test for #4162
        examattemptdata = {
            "item": "test",
            "start_timestamp": timezone.now(),
            "end_timestamp": timezone.now(),
            "correct": 0,
            "user": self.user1,
            "examlog": self.examlog,
            "content_id": "77b57a14a1f0466bb27ea7de8ff468be",
        }
        examattemptlog = ExamAttemptLog.objects.create(**examattemptdata)
        self.exam.active = False
        self.exam.save()
        response = self.client.patch(
            reverse(
                "kolibri:core:examattemptlog-detail", kwargs={"pk": examattemptlog.id}
            ),
            {"start_timestamp": timezone.now()},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_examlog_closed_patch_permissions(self):
        # Regression test for #4162
        examattemptdata = {
            "item": "test",
            "start_timestamp": timezone.now(),
            "end_timestamp": timezone.now(),
            "correct": 0,
            "user": self.user1,
            "examlog": self.examlog,
            "content_id": "77b57a14a1f0466bb27ea7de8ff468be",
        }
        examattemptlog = ExamAttemptLog.objects.create(**examattemptdata)
        self.examlog.closed = True
        self.examlog.save()
        response = self.client.patch(
            reverse(
                "kolibri:core:examattemptlog-detail", kwargs={"pk": examattemptlog.id}
            ),
            {"start_timestamp": timezone.now()},
            format="json",
        )
        self.assertEqual(response.status_code, 403)


class ExamLogAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility)
        cls.exam = Exam.objects.create(
            title="",
            question_count=1,
            collection=cls.facility,
            creator=cls.user2,
            active=True,
        )
        cls.examlog = ExamLog.objects.create(exam=cls.exam, user=cls.user1)
        # create classroom, learner group, add user1
        cls.classroom = ClassroomFactory.create(parent=cls.facility)
        cls.learner_group = LearnerGroupFactory.create(parent=cls.classroom)
        cls.classroom.add_member(cls.user1)
        cls.learner_group.add_learner(cls.user1)

        cls.class_coach = FacilityUserFactory.create(facility=cls.facility)
        cls.classroom.add_coach(cls.class_coach)

    def setUp(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def tearDown(self):
        self.client.logout()

    def test_class_coach_facility_log_filtering(self):
        # login as coach
        self.client.login(
            username=self.class_coach.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse("kolibri:core:examlog-list"), data={"collection": self.classroom.id}
        )
        expected_count = ExamLog.objects.filter(user=self.user1).count()
        self.assertEqual(len(response.data), expected_count)
