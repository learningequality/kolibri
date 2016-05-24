from __future__ import absolute_import, print_function, unicode_literals

import collections
import factory

from django.core.urlresolvers import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from .. import models

DUMMY_PASSWORD = "password"


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
