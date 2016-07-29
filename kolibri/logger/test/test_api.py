"""
Tests that ensure the correct items are returned from api calls.
Also tests whether the users with permissions can create logs.
"""

import uuid

from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from kolibri.auth.test.test_api import (
    FacilityFactory, ClassroomFactory,
    LearnerGroupFactory, FacilityUserFactory,
    DeviceOwnerFactory, DUMMY_PASSWORD
)

from .factory_logger import (
    ContentInteractionLogFactory, ContentSummaryLogFactory,
    ContentRatingLogFactory, UserSessionLogFactory,
)

from ..models import ContentInteractionLog, ContentSummaryLog, ContentRatingLog, UserSessionLog
from ..serializers import ContentInteractionLogSerializer, ContentSummaryLogSerializer, ContentRatingLogSerializer


class ContentInteractionLogAPITestCase(APITestCase):

    @classmethod
    def setUpClass(self):

        # create facilities, add some users and admin
        self.deviceowner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)

        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)

        # add admin to 1st facility
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(self.admin)

        # create logs for each user
        [ContentInteractionLogFactory.create(user=self.user1) for _ in range(3)]
        [ContentInteractionLogFactory.create(user=self.user2) for _ in range(2)]
        [ContentInteractionLogFactory.create(user=self.user3) for _ in range(1)]

        # create classroom, learner group, add user2
        self.classroom = ClassroomFactory.create(parent=self.facility)
        self.learner_group = LearnerGroupFactory.create(parent=self.classroom)
        self.learner_group.add_learner(self.user2)

    def setUp(self):
        self.payload = {'user': self.user1.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex,
                        'item_session': uuid.uuid4().hex}

    def test_interactionlog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentinteractionlog-list'))
        expected_count = ContentInteractionLog.objects.filter(user__facility_id=self.facility.id).count()
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
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentinteractionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_interactionlog_for_learner(self):
        response = self.client.post(reverse('contentinteractionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_create_interactionlog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentinteractionlog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentinteractionlog-list'), data={"user_id": self.user2.id})
        expected_count = ContentInteractionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        self.client.login(username=self.deviceowner.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse('contentinteractionlog-list'), data={"facility": self.facility2.id})
        expected_count = ContentInteractionLog.objects.filter(user__facility_id=self.facility2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_classroom_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentinteractionlog-list'), data={"classroom": self.classroom.id})
        expected_count = ContentInteractionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_learner_group_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentinteractionlog-list'), data={"learner_group": self.learner_group.id})
        expected_count = ContentInteractionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def tearDown(self):
        self.client.logout()

    @classmethod
    def tearDownClass(self):
        pass


class ContentSummaryLogAPITestCase(APITestCase):

    @classmethod
    def setUpClass(self):
        # create facilities, add some users and admin
        self.deviceowner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)

        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)

        # add admin to 1st facility
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(self.admin)

        # create logs for each user
        [ContentSummaryLogFactory.create(user=self.user1) for _ in range(3)]
        [ContentSummaryLogFactory.create(user=self.user2) for _ in range(2)]
        [ContentSummaryLogFactory.create(user=self.user3) for _ in range(1)]

        # create classroom, learner group, add user2
        self.classroom = ClassroomFactory.create(parent=self.facility)
        self.learner_group = LearnerGroupFactory.create(parent=self.classroom)
        self.learner_group.add_learner(self.user2)

    def setUp(self):
        self.payload = {'user': self.user1.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex}

    def test_summarylog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'))
        expected_count = ContentSummaryLog.objects.filter(user__facility_id=self.facility.id).count()
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
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_summarylog_for_learner(self):
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_create_summarylog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentsummarylog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentsummarylog-list'), data={"user_id": self.user2.id})
        expected_count = ContentSummaryLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        self.client.login(username=self.deviceowner.username, password=DUMMY_PASSWORD)
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

    @classmethod
    def tearDownClass(self):
        pass


class ContentRatingLogAPITestCase(APITestCase):

    @classmethod
    def setUpClass(self):
        # create facilities, add some users and admin
        self.deviceowner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)

        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)

        # add admin to 1st facility
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(self.admin)

        # create logs for each user
        [ContentRatingLogFactory.create(user=self.user1) for _ in range(3)]
        [ContentRatingLogFactory.create(user=self.user2) for _ in range(2)]
        [ContentRatingLogFactory.create(user=self.user3) for _ in range(1)]

        # create classroom, learner group, add user2
        self.classroom = ClassroomFactory.create(parent=self.facility)
        self.learner_group = LearnerGroupFactory.create(parent=self.classroom)
        self.learner_group.add_learner(self.user2)

    def setUp(self):
        self.payload = {'user': self.user1.pk,
                        'content_id': uuid.uuid4().hex,
                        'channel_id': uuid.uuid4().hex}

    def test_ratinglog_list(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentratinglog-list'))
        expected_count = ContentRatingLog.objects.filter(user__facility_id=self.facility.id).count()
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
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.post(reverse('contentratinglog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_anonymous_user_cannot_create_ratinglog_for_learner(self):
        response = self.client.post(reverse('contentratinglog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_user_can_create_ratinglog(self):
        del self.payload['user']
        response = self.client.post(reverse('contentratinglog-list'), data=self.payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentratinglog-list'), data={"user_id": self.user2.id})
        expected_count = ContentRatingLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        self.client.login(username=self.deviceowner.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse('contentratinglog-list'), data={"facility": self.facility2.id})
        expected_count = ContentRatingLog.objects.filter(user__facility_id=self.facility2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_classroom_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentratinglog-list'), data={"classroom": self.classroom.id})
        expected_count = ContentRatingLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_learner_group_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('contentratinglog-list'), data={"learner_group": self.learner_group.id})
        expected_count = ContentRatingLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def tearDown(self):
        self.client.logout()

    @classmethod
    def tearDownClass(self):
        pass


class UserSessionLogAPITestCase(APITestCase):

    @classmethod
    def setUpClass(self):
        # create facilities, add some users and admin
        self.deviceowner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.user1 = FacilityUserFactory.create(facility=self.facility)
        self.user2 = FacilityUserFactory.create(facility=self.facility)

        # add user3 to new facility
        self.facility2 = FacilityFactory.create()
        self.user3 = FacilityUserFactory.create(facility=self.facility2)

        # add admin to 1st facility
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(self.admin)

        # create logs for each user
        [UserSessionLogFactory.create(user=self.user1) for _ in range(3)]
        [UserSessionLogFactory.create(user=self.user2) for _ in range(2)]
        [UserSessionLogFactory.create(user=self.user3) for _ in range(1)]

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
        response = self.client.get(reverse('usersessionlog-detail', kwargs={"pk": 1}))
        log = UserSessionLog.objects.get(pk=1)
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

    def test_anonymous_user_can_create_sessionlog(self):
        response = self.client.post(reverse('usersessionlog-list'), format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_log_filtering(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD, facility=self.facility)
        response = self.client.get(reverse('usersessionlog-list'), data={"user_id": self.user2.id})
        expected_count = UserSessionLog.objects.filter(user__pk=self.user2.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_facility_log_filtering(self):
        self.client.login(username=self.deviceowner.username, password=DUMMY_PASSWORD)
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

    @classmethod
    def tearDownClass(self):
        pass
