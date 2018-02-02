"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""

import csv
import datetime
import uuid

from django.core.urlresolvers import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from kolibri.content.models import ChannelMetadata, ContentNode
from kolibri.core.exams.models import Exam
from kolibri.logger.models import ExamLog

from .factory_logger import (
    FacilityUserFactory, ContentSessionLogFactory,
    ContentSummaryLogFactory,
    UserSessionLogFactory
)

from ..models import ContentSessionLog, ContentSummaryLog, UserSessionLog
from ..serializers import ContentSessionLogSerializer, ContentSummaryLogSerializer
from kolibri.auth.test.test_api import FacilityFactory, ClassroomFactory, LearnerGroupFactory, DUMMY_PASSWORD
from kolibri.auth.test.helpers import create_superuser, provision_device

class ContentSessionLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.superuser = create_superuser(self.facility)
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)

        # add admin to 1st facility
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(self.admin)

        # create logs for each user
        self.interaction_logs = [ContentSessionLogFactory.create(user=self.user1, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex) for _ in range(3)]
        [ContentSessionLogFactory.create(user=self.user2, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex) for _ in range(2)]

        # create classroom, learner group, add user2
        self.classroom = ClassroomFactory.create(parent=self.facility)
        self.learner_group = LearnerGroupFactory.create(parent=self.classroom)
        self.learner_group.add_learner(self.user2)

        self.payload = {'user': self.user1.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex,
                        'kind': 'video',
                        'start_timestamp': str(datetime.datetime.now())}

    def test_contentsessionlog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsessionlog-list'))
        expected_count = ContentSessionLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_contentsessionlog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        log_id = self.interaction_logs[0].id
        response = self.client.get(reverse('contentsessionlog-detail', kwargs={"pk": log_id}))
        log = ContentSessionLog.objects.get(pk=log_id)
        interaction_serializer = ContentSessionLogSerializer(log)
        self.assertEqual(response.data['content_id'], interaction_serializer.data['content_id'])

    def test_admin_can_create_contentsessionlog(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentsessionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_contentsessionlog(self):
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentsessionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_contentsessionlog_for_learner(self):
        response = self.client.post(reverse('contentsessionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_create_contentsessionlog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentsessionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsessionlog-list'), data={"user_id": self.user2.id})
        expected_count = ContentSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD, facility=self.facility)
        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)
        [ContentSessionLogFactory.create(user=self.user3, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex) for _ in range(1)]
        response = self.client.get(reverse('contentsessionlog-list'), data={"facility": self.facility2.id})
        expected_count = ContentSessionLog.objects.filter(user__facility_id=self.facility2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_classroom_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsessionlog-list'), data={"classroom": self.classroom.id})
        expected_count = ContentSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_learner_group_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsessionlog-list'), data={"learner_group": self.learner_group.id})
        expected_count = ContentSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def tearDown(self):
        self.client.logout()


class ContentSummaryLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.superuser = create_superuser(self.facility)
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)

        # add admin to 1st facility
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(self.admin)

        # create logs for each user
        self.summary_logs = [ContentSummaryLogFactory.create(user=self.user1, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex) for _ in range(3)]
        [ContentSummaryLogFactory.create(user=self.user2, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex) for _ in range(2)]

        # create classroom, learner group, add user2
        self.classroom = ClassroomFactory.create(parent=self.facility)
        self.learner_group = LearnerGroupFactory.create(parent=self.classroom)
        self.learner_group.add_learner(self.user2)

        self.payload = {'user': self.user1.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex,
                        'kind': "video",
                        'start_timestamp': str(datetime.datetime.now())}

    def test_summarylog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'))
        expected_count = ContentSummaryLog.objects.filter(user__facility_id=self.facility.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_summarylog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        log_id = self.summary_logs[0].id
        response = self.client.get(reverse('contentsummarylog-detail', kwargs={"pk": log_id}))
        log = ContentSummaryLog.objects.get(pk=log_id)
        summary_serializer = ContentSummaryLogSerializer(log)
        self.assertEqual(response.data['content_id'], summary_serializer.data['content_id'])

    def test_admin_can_create_summarylog(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_summarylog(self):
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_summarylog_for_learner(self):
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_cannot_create_summarylog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'), data={"user_id": self.user2.id})
        expected_count = ContentSummaryLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        response = self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)
        [ContentSummaryLogFactory.create(user=self.user3, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex) for _ in range(1)]
        response = self.client.get(reverse('contentsummarylog-list'), data={"facility": self.facility2.id})
        expected_count = ContentSummaryLog.objects.filter(user__facility_id=self.facility2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_classroom_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'), data={"classroom": self.classroom.id})
        expected_count = ContentSummaryLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_learner_group_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'), data={"learner_group": self.learner_group.id})
        expected_count = ContentSummaryLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def tearDown(self):
        self.client.logout()


class UserSessionLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.superuser = create_superuser(self.facility)
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)

        # add admin to 1st facility
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(self.admin)

        # create logs for each user
        self.session_logs = [UserSessionLogFactory.create(user=self.user1) for _ in range(3)]
        [UserSessionLogFactory.create(user=self.user2) for _ in range(2)]

        # create classroom, learner group, add user2
        self.classroom = ClassroomFactory.create(parent=self.facility)
        self.learner_group = LearnerGroupFactory.create(parent=self.classroom)
        self.learner_group.add_learner(self.user2)

    def test_sessionlog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-list'))
        expected_count = UserSessionLog.objects.filter(user__facility_id=self.facility.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_sessionlog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        log_id = self.session_logs[0].id
        response = self.client.get(reverse('usersessionlog-detail', kwargs={"pk": log_id}))
        log = UserSessionLog.objects.get(pk=log_id)
        self.assertEqual(response.data['user'], log.user.id)

    def test_admin_can_create_sessionlog(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('usersessionlog-list'), data={'user': self.user1.pk}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_sessionlog(self):
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('usersessionlog-list'), data={'user': self.user1.pk}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_sessionlog_for_learner(self):
        response = self.client.post(reverse('usersessionlog-list'), data={'user': self.user1.pk}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_cannot_create_sessionlog(self):
        response = self.client.post(reverse('usersessionlog-list'), format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-list'), data={"user_id": self.user2.id})
        expected_count = UserSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        response = self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)
        [UserSessionLogFactory.create(user=self.user3) for _ in range(1)]
        response = self.client.get(reverse('usersessionlog-list'), data={"facility": self.facility2.id})
        expected_count = UserSessionLog.objects.filter(user__facility_id=self.facility2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_classroom_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-list'), data={"classroom": self.classroom.id})
        expected_count = UserSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_learner_group_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-list'), data={"learner_group": self.learner_group.id})
        expected_count = UserSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def tearDown(self):
        self.client.logout()


class ContentSummaryLogCSVExportTestCase(APITestCase):

    fixtures = ['content_test.json']

    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.summary_logs = [ContentSummaryLogFactory.create(
            user=self.user1,
            content_id=uuid.uuid4().hex,
            channel_id="6199dde695db4ee4ab392222d5af1e5c"
        ) for _ in range(3)]
        self.facility.add_admin(self.admin)

    def test_csv_download(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        expected_count = ContentSummaryLog.objects.count()
        response = self.client.get(reverse('contentsummarylogcsv-list'))
        results = list(csv.reader(row for row in response.content.decode("utf-8").split("\n") if row))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_deleted_content(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        expected_count = ContentSummaryLog.objects.count()
        ContentNode.objects.all().delete()
        ChannelMetadata.objects.all().delete()
        response = self.client.get(reverse('contentsummarylogcsv-list'))
        results = list(csv.reader(row for row in response.content.decode("utf-8").split("\n") if row))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)


class ContentSessionLogCSVExportTestCase(APITestCase):

    fixtures = ['content_test.json']

    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.interaction_logs = [ContentSessionLogFactory.create(
            user=self.user,
            content_id=uuid.uuid4().hex,
            channel_id="6199dde695db4ee4ab392222d5af1e5c"
        ) for _ in range(3)]
        self.facility.add_admin(self.admin)

    def test_csv_download(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        expected_count = ContentSessionLog.objects.count()
        response = self.client.get(reverse('contentsessionlogcsv-list'))
        results = list(csv.reader(row for row in response.content.decode("utf-8").split("\n") if row))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)

    def test_csv_download_deleted_content(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        expected_count = ContentSessionLog.objects.count()
        ContentNode.objects.all().delete()
        ChannelMetadata.objects.all().delete()
        response = self.client.get(reverse('contentsessionlogcsv-list'))
        results = list(csv.reader(row for row in response.content.decode("utf-8").split("\n") if row))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)


class ExamAttemptLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        # provision device to pass the setup_wizard middleware check
        provision_device()
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)
        self.exam = Exam.objects.create(title="", channel_id="", question_count=0, collection=self.facility, creator=self.user2, active=True)
        self.examlog = ExamLog.objects.create(exam=self.exam, user=self.user1)

        self.examattemptdata = {
            "item": "test",
            "start_timestamp": timezone.now(),
            "end_timestamp": timezone.now(),
            "correct": 0,
            "user": self.user1.pk,
            "examlog": self.examlog.pk,
            "content_id": "77b57a14a1f0466bb27ea7de8ff468be",
            "channel_id": "77b57a14a1f0466bb27ea7de8ff468be",
        }

    def test_exam_not_active_permissions(self):
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility)
        self.exam.active = False
        self.exam.save()
        response = self.client.post(reverse('examattemptlog-list'), data=self.examattemptdata)
        self.assertEqual(response.status_code, 403)

    def test_examlog_closed_permissions(self):
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility)
        self.examlog.closed = True
        self.examlog.save()
        response = self.client.post(reverse('examattemptlog-list'), data=self.examattemptdata)
        self.assertEqual(response.status_code, 403)

    def tearDown(self):
        self.client.logout()
