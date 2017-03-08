from __future__ import absolute_import, print_function, unicode_literals

import collections
import factory
import sys

from django.core.urlresolvers import reverse

from rest_framework import status
from rest_framework.test import APITestCase as BaseTestCase
from django.contrib.sessions.models import Session

from .. import models

DUMMY_PASSWORD = "password"


# A weird hack because of http://bugs.python.org/issue17866
if sys.version_info >= (3,):
    class APITestCase(BaseTestCase):
        def assertItemsEqual(self, *args, **kwargs):
            self.assertCountEqual(*args, **kwargs)
else:
    class APITestCase(BaseTestCase):
        pass


class FacilityFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.Facility

    name = factory.Sequence(lambda n: "Rock N' Roll High School #%d" % n)


class ClassroomFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.Classroom

    name = factory.Sequence(lambda n: "Basic Rock Theory #%d" % n)


class LearnerGroupFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.LearnerGroup

    name = factory.Sequence(lambda n: "Group #%d" % n)


class FacilityUserFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: 'user%d' % n)
    password = factory.PostGenerationMethodCall('set_password', DUMMY_PASSWORD)


class DeviceOwnerFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.DeviceOwner

    username = factory.Sequence(lambda n: 'deviceowner%d' % n)
    password = factory.PostGenerationMethodCall('set_password', DUMMY_PASSWORD)


class LearnerGroupAPITestCase(APITestCase):

    def setUp(self):
        self.device_owner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.classrooms = [ClassroomFactory.create(parent=self.facility) for _ in range(3)]
        self.learner_groups = []
        for classroom in self.classrooms:
            self.learner_groups += [LearnerGroupFactory.create(parent=classroom) for _ in range(5)]
        self.client.login(username=self.device_owner.username, password=DUMMY_PASSWORD)

    def test_learnergroup_list(self):
        response = self.client.get(reverse('learnergroup-list'), format='json')
        expected = [collections.OrderedDict((
            ('id', group.id),
            ('name', group.name),
            ('parent', group.parent.id),
        )) for group in self.learner_groups]
        self.assertItemsEqual(response.data, expected)

    def test_learnergroup_detail(self):
        response = self.client.get(reverse('learnergroup-detail', kwargs={'pk': self.learner_groups[0].id}), format='json')
        expected = {
            'id': self.learner_groups[0].id,
            'name': self.learner_groups[0].name,
            'parent': self.learner_groups[0].parent.id,
        }
        self.assertDictEqual(response.data, expected)

    def test_parent_in_queryparam_with_one_id(self):
        classroom_id = self.classrooms[0].id
        response = self.client.get(reverse('learnergroup-list'), {'parent': classroom_id},
                                   format='json')
        expected = [collections.OrderedDict((
            ('id', group.id),
            ('name', group.name),
            ('parent', group.parent.id),
        )) for group in self.learner_groups if group.parent.id == classroom_id]
        self.assertItemsEqual(response.data, expected)


class ClassroomAPITestCase(APITestCase):

    def setUp(self):
        self.device_owner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.classrooms = [ClassroomFactory.create(parent=self.facility) for _ in range(10)]
        self.learner_group = LearnerGroupFactory.create(parent=self.classrooms[0])
        self.client.login(username=self.device_owner.username, password=DUMMY_PASSWORD)

    def test_classroom_list(self):
        response = self.client.get(reverse('classroom-list'), format='json')
        expected = [collections.OrderedDict((
            ('id', classroom.id),
            ('name', classroom.name),
            ('parent', classroom.parent.id),
        )) for classroom in self.classrooms]
        self.assertItemsEqual(response.data, expected)

    def test_classroom_detail(self):
        response = self.client.get(reverse('classroom-detail', kwargs={'pk': self.classrooms[0].id}), format='json')
        expected = {
            'id': self.classrooms[0].id,
            'name': self.classrooms[0].name,
            'parent': self.classrooms[0].parent.id,
        }
        self.assertDictEqual(response.data, expected)


class FacilityAPITestCase(APITestCase):

    def setUp(self):
        self.device_owner = DeviceOwnerFactory.create()
        self.facility1 = FacilityFactory.create()
        self.facility2 = FacilityFactory.create()
        self.user1 = FacilityUserFactory.create(facility=self.facility1)
        self.user2 = FacilityUserFactory.create(facility=self.facility2)

    def test_sanity(self):
        self.assertTrue(self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility1))

    def test_facility_user_can_get_detail(self):
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility1)
        response = self.client.get(reverse('facility-detail', kwargs={'pk': self.facility1.pk}),
                                   format='json')
        # .assertDictContainsSubset checks that the first argument is a subset of the second argument
        self.assertDictContainsSubset({
            'name': self.facility1.name,
        }, dict(response.data))

    def test_anonymous_user_gets_empty_list(self):
        response = self.client.get(reverse('facility-list'), format='json')
        self.assertEqual(response.data, [])

    def test_device_admin_can_create_facility(self):
        new_facility_name = "New Facility"
        self.client.login(username=self.device_owner.username, password=DUMMY_PASSWORD)
        self.assertEqual(models.Facility.objects.filter(name=new_facility_name).count(), 0)
        response = self.client.post(reverse('facility-list'), {"name": new_facility_name}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(models.Facility.objects.filter(name=new_facility_name).count(), 1)

    def test_facility_user_cannot_create_facility(self):
        new_facility_name = "New Facility"
        self.client.login(username=self.user1.username, password=DUMMY_PASSWORD, facility=self.facility1)
        self.assertEqual(models.Facility.objects.filter(name=new_facility_name).count(), 0)
        response = self.client.post(reverse('facility-list'), {"name": new_facility_name}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(models.Facility.objects.filter(name=new_facility_name).count(), 0)

    def test_anonymous_user_cannot_create_facility(self):
        new_facility_name = "New Facility"
        self.assertEqual(models.Facility.objects.filter(name=new_facility_name).count(), 0)
        response = self.client.post(reverse('facility-list'), {"name": new_facility_name}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(models.Facility.objects.filter(name=new_facility_name).count(), 0)

    def test_device_admin_can_update_facility(self):
        old_facility_name = self.facility1.name
        new_facility_name = "Renamed Facility"
        self.client.login(username=self.device_owner.username, password=DUMMY_PASSWORD)
        self.assertEqual(models.Facility.objects.get(id=self.facility1.id).name, old_facility_name)
        response = self.client.put(reverse('facility-detail', kwargs={"pk": self.facility1.id}), {"name": new_facility_name}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(models.Facility.objects.get(id=self.facility1.id).name, new_facility_name)

    def test_device_admin_can_delete_facility(self):
        self.client.login(username=self.device_owner.username, password=DUMMY_PASSWORD)
        self.assertEqual(models.Facility.objects.filter(id=self.facility1.id).count(), 1)
        response = self.client.delete(reverse('facility-detail', kwargs={"pk": self.facility1.id}))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(models.Facility.objects.filter(id=self.facility1.id).count(), 0)


class UserCreationTestCase(APITestCase):

    def setUp(self):
        self.device_owner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.client.login(username=self.device_owner.username, password=DUMMY_PASSWORD)

    def test_creating_device_owner_via_api_sets_password_correctly(self):
        new_username = "goliath"
        new_password = "davidsucks"
        bad_password = "ilovedavid"
        response = self.client.post(reverse('deviceowner-list'), {"username": new_username, "password": new_password}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.DeviceOwner.objects.get(username=new_username).check_password(new_password))
        self.assertFalse(models.DeviceOwner.objects.get(username=new_username).check_password(bad_password))

    def test_creating_facility_user_via_api_sets_password_correctly(self):
        new_username = "goliath"
        new_password = "davidsucks"
        bad_password = "ilovedavid"
        data = {"username": new_username, "password": new_password, "facility": self.facility.id}
        response = self.client.post(reverse('facilityuser-list'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.FacilityUser.objects.get(username=new_username).check_password(new_password))
        self.assertFalse(models.FacilityUser.objects.get(username=new_username).check_password(bad_password))

    def test_creating_same_facility_user_throws_400_error(self):
        new_username = "goliath"
        new_password = "davidsucks"
        data = {"username": new_username, "password": new_password, "facility": self.facility.id}
        response = self.client.post(reverse('facilityuser-list'), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.post(reverse('facilityuser-list'), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_creating_same_device_owner_throws_400_error(self):
        new_username = "goliath"
        new_password = "davidsucks"
        data = {"username": new_username, "password": new_password}
        response = self.client.post(reverse('deviceowner-list'), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.post(reverse('deviceowner-list'), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class UserUpdateTestCase(APITestCase):

    def setUp(self):
        self.device_owner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.login(username=self.device_owner.username, password=DUMMY_PASSWORD)

    def test_user_update_info(self):
        self.client.patch(reverse('facilityuser-detail', kwargs={'pk': self.user.pk}), {'username': 'foo'}, format="json")
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "foo")

    def test_user_update_password(self):
        new_password = 'baz'
        self.client.patch(reverse('facilityuser-detail', kwargs={'pk': self.user.pk}), {'password': new_password}, format="json")
        self.client.logout()
        response = self.client.login(username=self.user.username, password=new_password, facility=self.facility)
        self.assertTrue(response)

    def test_device_owner_update_info(self):
        self.client.patch(reverse('deviceowner-detail', kwargs={'pk': self.device_owner.pk}), {'username': 'foo'}, format="json")
        self.device_owner.refresh_from_db()
        self.assertEqual(self.device_owner.username, "foo")

    def test_device_owner_update_password(self):
        new_password = 'baz'
        self.client.patch(reverse('deviceowner-detail', kwargs={'pk': self.device_owner.pk}), {'password': new_password}, format="json")
        self.client.logout()
        response = self.client.login(username=self.device_owner.username, password=new_password)
        self.assertTrue(response)


class LoginLogoutTestCase(APITestCase):

    def setUp(self):
        self.device_owner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.admin = FacilityUserFactory.create(facility=self.facility, password="bar")
        self.facility.add_admin(self.admin)
        self.cr = ClassroomFactory.create(parent=self.facility)
        self.cr.add_coach(self.admin)

    def test_login_and_logout_device_owner(self):
        self.client.post(reverse('session-list'), data={"username": self.device_owner.username, "password": DUMMY_PASSWORD})
        sessions = Session.objects.all()
        self.assertEqual(len(sessions), 1)
        self.client.delete(reverse('session-detail', kwargs={'pk': 'current'}))
        self.assertEqual(len(Session.objects.all()), 0)

    def test_login_and_logout_facility_user(self):
        self.client.post(reverse('session-list'), data={"username": self.user.username, "password": DUMMY_PASSWORD, "facility": self.facility.id})
        sessions = Session.objects.all()
        self.assertEqual(len(sessions), 1)
        self.client.delete(reverse('session-detail', kwargs={'pk': 'current'}))
        self.assertEqual(len(Session.objects.all()), 0)

    def test_incorrect_credentials_does_not_log_in_user(self):
        self.client.post(reverse('session-list'), data={"username": self.user.username, "password": "foo", "facility": self.facility.id})
        sessions = Session.objects.all()
        self.assertEqual(len(sessions), 0)

    def test_session_return_admin_and_coach_kind(self):
        self.client.post(reverse('session-list'), data={"username": self.admin.username, "password": "bar", "facility": self.facility.id})
        response = self.client.get(reverse('session-detail', kwargs={'pk': 'current'}))
        self.assertTrue(response.data['kind'][0], 'admin')
        self.assertTrue(response.data['kind'][1], 'coach')

    def test_session_return_anon_kind(self):
        response = self.client.get(reverse('session-detail', kwargs={'pk': 'current'}))
        self.assertTrue(response.data['kind'][0], 'anonymous')


class AnonSignUpTestCase(APITestCase):

    def setUp(self):
        self.device_owner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()

    def test_anon_sign_up_creates_user(self):
        response = self.client.post(reverse('signup-list'), data={"username": "user", "password": DUMMY_PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.FacilityUser.objects.all())

    def test_anon_sign_up_returns_user(self):
        full_name = "Bob Lee"
        response = self.client.post(reverse('signup-list'), data={"full_name": full_name, "username": "user", "password": DUMMY_PASSWORD})
        self.assertEqual(response.data['username'], 'user')
        self.assertEqual(response.data['full_name'], full_name)

    def test_create_user_with_same_username_fails(self):
        FacilityUserFactory.create(username='bob')
        response = self.client.post(reverse('signup-list'), data={"username": "bob", "password": DUMMY_PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(models.FacilityUser.objects.all()), 1)

    def test_create_bad_username_fails(self):
        response = self.client.post(reverse('signup-list'), data={"username": "(***)", "password": DUMMY_PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(models.FacilityUser.objects.all())

    def test_sign_up_also_logs_in_user(self):
        self.assertFalse(Session.objects.all())
        self.client.post(reverse('signup-list'), data={"username": "user", "password": DUMMY_PASSWORD})
        self.assertTrue(Session.objects.all())


class FacilityDatasetAPITestCase(APITestCase):

    def setUp(self):
        self.device_owner = DeviceOwnerFactory.create()
        self.facility = FacilityFactory.create()
        FacilityFactory.create(name='extra')
        self.admin = FacilityUserFactory.create(facility=self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(self.admin)

    def test_return_dataset_that_user_is_an_admin_for(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse('facilitydataset-list'))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(self.admin.dataset_id, response.data[0]['id'])

    def test_return_all_datasets_for_device_owner(self):
        self.client.login(username=self.device_owner.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse('facilitydataset-list'))
        self.assertEqual(len(response.data), len(models.FacilityDataset.objects.all()))

    def test_return_nothing_for_facility_user(self):
        self.client.login(username=self.user.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse('facilitydataset-list'))
        self.assertEqual(len(response.data), 0)
