from __future__ import absolute_import, print_function, unicode_literals

import factory

from django.core.urlresolvers import reverse

from rest_framework.test import APITestCase

from .. import models


class FacilityFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.Facility

    name = factory.Sequence(lambda n: "Rock N' Roll High School #%d" % n)


class FacilityUserFactory(factory.DjangoModelFactory):

    class Meta:
        model = models.FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: 'user%d' % n)
    password = factory.PostGenerationMethodCall('set_password', 'password')


class FacilityApiTestCase(APITestCase):

    def setUp(self):
        self.password = 'abc123'
        self.facility1 = FacilityFactory.create()
        self.facility2 = FacilityFactory.create()
        self.user1 = FacilityUserFactory.create(facility=self.facility1)
        self.user2 = FacilityUserFactory.create(facility=self.facility2)

    def test_sanity(self):
        self.assertTrue(self.client.login(username=self.user1.username, password="password", facility=self.facility1))

    def test_facility_user_can_get_detail(self):
        self.client.login(username=self.user1.username, password="password", facility=self.facility1)
        response = self.client.get(reverse('facility-detail', kwargs={'pk': self.facility1.pk}),
                                   format='json')
        # .assertDictContainsSubset checks that the first argument is a subset of the second argument
        self.assertDictContainsSubset({
            'name': self.facility1.name,
        }, dict(response.data))

    def test_anonymous_user_gets_empty_list(self):
        response = self.client.get(reverse('facility-list'), format='json')
        self.assertEqual(response.data, [])
