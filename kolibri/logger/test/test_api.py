"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""

import csv
import StringIO
import uuid

from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .factory_logger import (
    FacilityFactory, FacilityUserFactory,
    ContentInteractionLogFactory, ContentSummaryLogFactory,
    ContentRatingLogFactory, UserSessionLogFactory,
    DUMMY_PASSWORD
)

from ..models import ContentInteractionLog, ContentSummaryLog, ContentRatingLog, UserSessionLog
from ..serializers import ContentInteractionLogSerializer, ContentSummaryLogSerializer, ContentRatingLogSerializer


class ContentInteractionLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.interaction_log = []
        self.interaction_log += [ContentInteractionLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)
        self.payload = {'user': self.user.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex,
                        'item_session': uuid.uuid4().hex}

    def test_interactionlog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentinteractionlog-list'))
        expected_count = ContentInteractionLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_interactionlog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentinteractionlog-detail', kwargs={"pk": 1}))
        log = ContentInteractionLog.objects.get(pk=1)
        interaction_serializer = ContentInteractionLogSerializer(log)
        self.assertEqual(response.data['content_id'], interaction_serializer.data['content_id'])

    def test_admin_can_create_interactionlog(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentinteractionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_learner_can_create_interactionlog(self):
        self.client.login(username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentinteractionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_interactionlog_for_learner(self):
        response = self.client.post(reverse('contentinteractionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_create_interactionlog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentinteractionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ContentSummaryLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.summary_log = []
        self.summary_log += [ContentSummaryLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)
        self.payload = {'user': self.user.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex}

    def test_summarylog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'))
        expected_count = ContentSummaryLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_summarylog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-detail', kwargs={"pk": 1}))
        log = ContentSummaryLog.objects.get(pk=1)
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

    def test_anonymous_user_can_create_summarylog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ContentRatingLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.rating_log = []
        self.rating_log += [ContentRatingLogFactory.create(user=self.user) for _ in range(3)]
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
        response = self.client.get(reverse('contentratinglog-detail', kwargs={"pk": 1}))
        log = ContentRatingLog.objects.get(pk=1)
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
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.session_log = []
        self.session_log += [UserSessionLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)

    def test_sessionlog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-list'))
        expected_count = UserSessionLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_sessionlog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-detail', kwargs={"pk": 1}))
        log = UserSessionLog.objects.get(pk=1)
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

    def test_anonymous_user_can_create_sessionlog(self):
        response = self.client.post(reverse('usersessionlog-list'), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class ContentSummaryLogCSVExportTestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.summary_log = []
        self.summary_log += [ContentSummaryLogFactory.create(user=self.user) for _ in range(3)]
        self.facility.add_admin(self.admin)

    def test_csv_download(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        expected_count = ContentSummaryLog.objects.count()
        response = self.client.get(reverse('contentsummarylogcsv-list'))
        results = list(csv.reader(StringIO.StringIO(response.content)))
        for row in results[1:]:
            self.assertEqual(len(results[0]), len(row))
        self.assertEqual(len(results[1:]), expected_count)
