"""
Tests that ensure the correct items are returned from api calls.
"""

import factory
from rest_framework.test import APITestCase

from django.core.urlresolvers import reverse
from kolibri.auth import models as auth
from .. import models

DUMMY_PASSWORD = "password"


class FacilityFactory(factory.DjangoModelFactory):

    class Meta:
        model = auth.Facility

    name = factory.Sequence(lambda n: "Rock N' Roll High School #%d" % n)


class FacilityUserFactory(factory.DjangoModelFactory):

    class Meta:
        model = auth.FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: 'user%d' % n)
    password = factory.PostGenerationMethodCall('set_password', DUMMY_PASSWORD)


class ContentInteractionLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.ContentInteractionLog

    user = factory.SubFactory(FacilityUserFactory)


class ContentSummaryLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.ContentSummaryLog

    user = factory.SubFactory(FacilityUserFactory)


class ContentRatingLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.ContentRatingLog

    user = factory.SubFactory(FacilityUserFactory)


class UserSessionLogFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.UserSessionLog

    user = factory.SubFactory(FacilityUserFactory)


class ContentInteractionLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.interaction_log = []
        self.interaction_log += [ContentInteractionLogFactory.create(user=self.user) for _ in range(5)]
        self.facility.add_admin(self.admin)

    def test_interactionlog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentinteractionlog-list'), format='json')
        expected_count = models.ContentInteractionLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_interactionlog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentinteractionlog-detail', kwargs={"pk": 1}), format='json')
        log = models.ContentInteractionLog.objects.get(pk=1)
        self.assertEqual(response.data['content_id'], log.content_id)


class ContentSummaryLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.summary_log = []
        self.summary_log += [ContentSummaryLogFactory.create(user=self.user) for _ in range(5)]
        self.facility.add_admin(self.admin)

    def test_summarylog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'), format='json')
        expected_count = models.ContentSummaryLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_summarylog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-detail', kwargs={"pk": 1}), format='json')
        log = models.ContentSummaryLog.objects.get(pk=1)
        self.assertEqual(response.data['content_id'], log.content_id)


class ContentRatingLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.rating_log = []
        self.rating_log += [ContentRatingLogFactory.create(user=self.user) for _ in range(5)]
        self.facility.add_admin(self.admin)

    def test_ratinglog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentratinglog-list'), format='json')
        expected_count = models.ContentRatingLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_ratinglog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentratinglog-detail', kwargs={"pk": 1}), format='json')
        log = models.ContentRatingLog.objects.get(pk=1)
        self.assertEqual(response.data['content_id'], log.content_id)


class UserSessionLogAPITestCase(APITestCase):

    def setUp(self):
        self.facility = FacilityFactory.create()
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.session_log = []
        self.session_log += [UserSessionLogFactory.create(user=self.user) for _ in range(5)]
        self.facility.add_admin(self.admin)

    def test_sessionlog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-list'), format='json')
        expected_count = models.UserSessionLog.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_sessionlog_detail(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-detail', kwargs={"pk": 1}), format='json')
        log = models.UserSessionLog.objects.get(pk=1)
        self.assertEqual(response.data['user'], log.user.id)
