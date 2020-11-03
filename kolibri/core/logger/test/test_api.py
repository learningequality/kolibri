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
from mock import patch
from rest_framework import status
from rest_framework.test import APITestCase

from ..models import ContentSessionLog
from ..models import ContentSummaryLog
from ..models import UserSessionLog
from ..serializers import ContentSessionLogSerializer
from ..serializers import ContentSummaryLogSerializer
from ..serializers import ExamLogSerializer
from .factory_logger import ContentSessionLogFactory
from .factory_logger import ContentSummaryLogFactory
from .factory_logger import FacilityUserFactory
from .factory_logger import UserSessionLogFactory
from kolibri.core.auth.test.helpers import create_superuser
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


class ContentSessionLogAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.superuser = create_superuser(cls.facility)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility)

        # add admin to 1st facility
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)

        # create logs for each user
        cls.interaction_logs = [
            ContentSessionLogFactory.create(
                user=cls.user1,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )
            for _ in range(3)
        ]
        [
            ContentSessionLogFactory.create(
                user=cls.user2,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )
            for _ in range(2)
        ]

        # create classroom, learner group, add user2
        cls.classroom = ClassroomFactory.create(parent=cls.facility)
        cls.learner_group = LearnerGroupFactory.create(parent=cls.classroom)
        cls.learner_group.add_learner(cls.user2)

    def setUp(self):
        self.payload = {
            "user": self.user1.pk,
            "content_id": uuid.uuid4().hex,
            "channel_id": uuid.uuid4().hex,
            "kind": "video",
            "start_timestamp": str(datetime.datetime.now()),
        }

        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def tearDown(self):
        self.client.logout()

    def test_contentsessionlog_list(self):
        response = self.client.get(reverse("kolibri:core:contentsessionlog-list"))
        expected_count = ContentSessionLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_contentsessionlog_detail(self):
        log_id = self.interaction_logs[0].id
        response = self.client.get(
            reverse("kolibri:core:contentsessionlog-detail", kwargs={"pk": log_id})
        )
        log = ContentSessionLog.objects.get(pk=log_id)
        interaction_serializer = ContentSessionLogSerializer(log)
        self.assertEqual(
            response.data["content_id"], interaction_serializer.data["content_id"]
        )

    def test_admin_can_create_contentsessionlog(self):
        response = self.client.post(
            reverse("kolibri:core:contentsessionlog-list"),
            data=self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_contentsessionlog(self):
        response = self.client.post(
            reverse("kolibri:core:contentsessionlog-list"),
            data=self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_contentsessionlog_for_learner(self):
        # logout for anonymous session
        self.client.logout()
        response = self.client.post(
            reverse("kolibri:core:contentsessionlog-list"),
            data=self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_create_contentsessionlog(self):
        # logout for anonymous session
        self.client.logout()
        del self.payload["user"]
        response = self.client.post(
            reverse("kolibri:core:contentsessionlog-list"),
            data=self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:contentsessionlog-list"),
            data={"user_id": self.user2.id},
        )
        expected_count = ContentSessionLog.objects.filter(
            user__pk=self.user2.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_superuser_facility_log_filtering(self):
        # login as superuser
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        # add user3 to new facility
        facility3 = FacilityFactory.create()
        user3 = FacilityUserFactory.create(facility=facility3)
        [
            ContentSessionLogFactory.create(
                user=user3,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )
            for _ in range(1)
        ]
        response = self.client.get(
            reverse("kolibri:core:contentsessionlog-list"),
            data={"facility": facility3.id},
        )
        expected_count = ContentSessionLog.objects.filter(
            user__facility_id=facility3.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_classroom_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:contentsessionlog-list"),
            data={"classroom": self.classroom.id},
        )
        expected_count = ContentSessionLog.objects.filter(
            user__pk=self.user2.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_learner_group_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:contentsessionlog-list"),
            data={"learner_group": self.learner_group.id},
        )
        expected_count = ContentSessionLog.objects.filter(
            user__pk=self.user2.id
        ).count()
        self.assertEqual(len(response.data), expected_count)


class ContentSummaryLogAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.superuser = create_superuser(cls.facility)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility)

        # add admin to 1st facility
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)

        # create logs for each user
        cls.summary_logs = [
            ContentSummaryLogFactory.create(
                user=cls.user1,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )
            for _ in range(3)
        ]
        [
            ContentSummaryLogFactory.create(
                user=cls.user2,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )
            for _ in range(2)
        ]

        # create classroom, learner group, add user2
        cls.classroom = ClassroomFactory.create(parent=cls.facility)
        cls.learner_group = LearnerGroupFactory.create(parent=cls.classroom)
        cls.learner_group.add_learner(cls.user2)

    def setUp(self):
        self.payload = {
            "user": self.user1.pk,
            "content_id": uuid.uuid4().hex,
            "channel_id": uuid.uuid4().hex,
            "kind": "video",
            "start_timestamp": str(datetime.datetime.now()),
        }
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_summarylog_list(self):
        response = self.client.get(reverse("kolibri:core:contentsummarylog-list"))
        expected_count = ContentSummaryLog.objects.filter(
            user__facility_id=self.facility.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_summarylog_detail(self):
        log_id = self.summary_logs[0].id
        response = self.client.get(
            reverse("kolibri:core:contentsummarylog-detail", kwargs={"pk": log_id})
        )
        log = ContentSummaryLog.objects.get(pk=log_id)
        summary_serializer = ContentSummaryLogSerializer(log)
        self.assertEqual(
            response.data["content_id"], summary_serializer.data["content_id"]
        )

    def test_admin_can_create_summarylog(self):
        with patch("kolibri.core.logger.serializers.wrap_to_save_queue"):
            response = self.client.post(
                reverse("kolibri:core:contentsummarylog-list"),
                data=self.payload,
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_summarylog(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        with patch("kolibri.core.logger.serializers.wrap_to_save_queue"):
            response = self.client.post(
                reverse("kolibri:core:contentsummarylog-list"),
                data=self.payload,
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_summarylog_for_learner(self):
        self.client.logout()
        response = self.client.post(
            reverse("kolibri:core:contentsummarylog-list"),
            data=self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_cannot_create_summarylog(self):
        self.client.logout()
        del self.payload["user"]
        response = self.client.post(
            reverse("kolibri:core:contentsummarylog-list"),
            data=self.payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:contentsummarylog-list"),
            data={"user_id": self.user2.id},
        )
        expected_count = ContentSummaryLog.objects.filter(
            user__pk=self.user2.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        response = self.client.login(
            username=self.superuser.username, password=DUMMY_PASSWORD
        )
        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)
        [
            ContentSummaryLogFactory.create(
                user=self.user3,
                content_id=uuid.uuid4().hex,
                channel_id=uuid.uuid4().hex,
            )
            for _ in range(1)
        ]
        response = self.client.get(
            reverse("kolibri:core:contentsummarylog-list"),
            data={"facility": self.facility2.id},
        )
        expected_count = ContentSummaryLog.objects.filter(
            user__facility_id=self.facility2.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_classroom_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:contentsummarylog-list"),
            data={"classroom": self.classroom.id},
        )
        expected_count = ContentSummaryLog.objects.filter(
            user__pk=self.user2.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_learner_group_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:contentsummarylog-list"),
            data={"learner_group": self.learner_group.id},
        )
        expected_count = ContentSummaryLog.objects.filter(
            user__pk=self.user2.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def tearDown(self):
        self.client.logout()


class UserSessionLogAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        cls.superuser = create_superuser(cls.facility)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility)

        # add admin to 1st facility
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)

        # create logs for each user
        cls.session_logs = [
            UserSessionLogFactory.create(user=cls.user1) for _ in range(3)
        ]
        [UserSessionLogFactory.create(user=cls.user2) for _ in range(2)]

        # create classroom, learner group, add user2
        cls.classroom = ClassroomFactory.create(parent=cls.facility)
        cls.learner_group = LearnerGroupFactory.create(parent=cls.classroom)
        cls.learner_group.add_learner(cls.user2)

    def setUp(self):
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def tearDown(self):
        self.client.logout()

    def test_sessionlog_list(self):
        response = self.client.get(reverse("kolibri:core:usersessionlog-list"))
        expected_count = UserSessionLog.objects.filter(
            user__facility_id=self.facility.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_sessionlog_detail(self):
        log_id = self.session_logs[0].id
        response = self.client.get(
            reverse("kolibri:core:usersessionlog-detail", kwargs={"pk": log_id})
        )
        log = UserSessionLog.objects.get(pk=log_id)
        self.assertEqual(response.data["user"], log.user.id)

    def test_admin_can_create_sessionlog(self):
        response = self.client.post(
            reverse("kolibri:core:usersessionlog-list"),
            data={"user": self.user1.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_sessionlog(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.post(
            reverse("kolibri:core:usersessionlog-list"),
            data={"user": self.user1.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_sessionlog_for_learner(self):
        self.client.logout()
        response = self.client.post(
            reverse("kolibri:core:usersessionlog-list"),
            data={"user": self.user1.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_cannot_create_sessionlog(self):
        self.client.logout()
        response = self.client.post(
            reverse("kolibri:core:usersessionlog-list"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:usersessionlog-list"), data={"user_id": self.user2.id}
        )
        expected_count = UserSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        response = self.client.login(
            username=self.superuser.username, password=DUMMY_PASSWORD
        )
        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)
        [UserSessionLogFactory.create(user=self.user3) for _ in range(1)]
        response = self.client.get(
            reverse("kolibri:core:usersessionlog-list"),
            data={"facility": self.facility2.id},
        )
        expected_count = UserSessionLog.objects.filter(
            user__facility_id=self.facility2.id
        ).count()
        self.assertEqual(len(response.data), expected_count)

    def test_classroom_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:usersessionlog-list"),
            data={"classroom": self.classroom.id},
        )
        expected_count = UserSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_learner_group_log_filtering(self):
        response = self.client.get(
            reverse("kolibri:core:usersessionlog-list"),
            data={"learner_group": self.learner_group.id},
        )
        expected_count = UserSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)


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
