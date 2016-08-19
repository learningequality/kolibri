"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""

import csv
import datetime
import uuid

from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from kolibri.auth.models import DeviceOwner

from .factory_logger import (
    FacilityFactory, FacilityUserFactory,
    ContentSessionLogFactory, ContentSummaryLogFactory,
    ContentRatingLogFactory, UserSessionLogFactory,
    DUMMY_PASSWORD
)

from ..models import ContentSessionLog, ContentSummaryLog, ContentRatingLog, UserSessionLog
from ..serializers import ContentSessionLogSerializer, ContentSummaryLogSerializer, ContentRatingLogSerializer


class ContentSessionLogAPITestCase(APITestCase):

    def setUp(self):
        # create DeviceOwner to pass the setup_wizard middleware check
        DeviceOwner.objects.create(username='test-device-owner', password=123)
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.interaction_logs = [ContentSessionLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)
        self.payload = {'user': self.user.pk,
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
        self.client.login(username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentsessionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_contentsessionlog_for_learner(self):
        response = self.client.post(reverse('contentsessionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_create_contentsessionlog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentsessionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ContentSummaryLogAPITestCase(APITestCase):

    def setUp(self):
        # create DeviceOwner to pass the setup_wizard middleware check
        DeviceOwner.objects.create(username='test-device-owner', password=123)
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.summary_logs = [ContentSummaryLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)
        self.payload = {'user': self.user.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex,
                        'kind': "video",
                        'start_timestamp': str(datetime.datetime.now())}

    def test_summarylog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'))
        expected_count = ContentSummaryLog.objects.count()
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
        self.client.login(username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_summarylog_for_learner(self):
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ContentRatingLogAPITestCase(APITestCase):

    def setUp(self):
        # create DeviceOwner to pass the setup_wizard middleware check
        DeviceOwner.objects.create(username='test-device-owner', password=123)
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.rating_logs = [ContentRatingLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)
        self.payload = {'user': self.user.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex}

    def test_ratinglog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentratinglog-list'))
        expected_count = ContentRatingLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_ratinglog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        log_id = self.rating_logs[0].id
        response = self.client.get(reverse('contentratinglog-detail', kwargs={"pk": log_id}))
        log = ContentRatingLog.objects.get(pk=log_id)
        rating_serializer = ContentRatingLogSerializer(log)
        self.assertEqual(response.data['content_id'], rating_serializer.data['content_id'])

    def test_admin_can_create_ratinglog(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentratinglog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_ratinglog(self):
        self.client.login(username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentratinglog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_ratinglog_for_learner(self):
        response = self.client.post(reverse('contentratinglog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_create_ratinglog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentratinglog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class UserSessionLogAPITestCase(APITestCase):

    def setUp(self):
        # create DeviceOwner to pass the setup_wizard middleware check
        DeviceOwner.objects.create(username='test-device-owner', password=123)
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.session_logs = [UserSessionLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)

    def test_sessionlog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-list'))
        expected_count = UserSessionLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_sessionlog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        log_id = self.session_logs[0].id
        response = self.client.get(reverse('usersessionlog-detail', kwargs={"pk": log_id}))
        log = UserSessionLog.objects.get(pk=log_id)
        self.assertEqual(response.data['user'], log.user.id)

    def test_admin_can_create_sessionlog(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('usersessionlog-list'), data={'user': self.user.pk}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_sessionlog(self):
        self.client.login(username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('usersessionlog-list'), data={'user': self.user.pk}, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_sessionlog_for_learner(self):
        response = self.client.post(reverse('usersessionlog-list'), data={'user': self.user.pk}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ContentSummaryLogCSVExportTestCase(APITestCase):

    def setUp(self):
        # create DeviceOwner to pass the setup_wizard middleware check
        DeviceOwner.objects.create(username='test-device-owner', password=123)
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.summary_logs = [ContentSummaryLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)

    def test_csv_download(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        expected_count = ContentSummaryLog.objects.count()
        response = self.client.get(reverse('contentsummarylogcsv-list'))
        results = list(csv.reader(row for row in response.content.decode("utf-8").split("\n") if row))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)


class ContentSessionLogCSVExportTestCase(APITestCase):

    def setUp(self):
        # create DeviceOwner to pass the setup_wizard middleware check
        DeviceOwner.objects.create(username='test-device-owner', password=123)
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.interaction_logs = [ContentSessionLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)

    def test_csv_download(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        expected_count = ContentSessionLog.objects.count()
        response = self.client.get(reverse('contentsessionlogcsv-list'))
        results = list(csv.reader(row for row in response.content.decode("utf-8").split("\n") if row))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
