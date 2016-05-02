from __future__ import absolute_import, print_function, unicode_literals

import factory

from django.core.urlresolvers import reverse

from rest_framework.test import APITestCase

from .. import models


class FacilityFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Facility

    name = "Rock N' Roll High School"


class FacilityUserFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: 'user%d' % n)


class FacilityApiTestCase(APITestCase):

    def setUp(self):
        self.password = 'abc123'
        self.facility = FacilityFactory.create()
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.user.set_password(self.password)
        self.user.save()

    def test_sanity(self):
        self.assertTrue(self.client.login(username=self.user.username, password=self.password, facility=self.facility))

    def test_facility_user_can_get_detail(self):
        response = self.client.get(reverse('rest_framework:facility-detail', kwargs={'pk': self.facility.pk}),
                                   format='json')
        # .assertDictContainsSubset checks that the first argument is a subset of the second argument
        self.assertDictContainsSubset({
            'name': self.facility.name,
            'kind': self.facility.kind,
            'parent': ''
        }, response.data)

    def test_facility_user_cant_get_list(self):
        response = self.client.get(reverse('rest_framework:facility-list'), format='json')
        self.assertEqual(response.status_code, 403)
