from __future__ import absolute_import, print_function, unicode_literals

import factory

from django.test import TestCase, Client

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


class FacilityApiTestCase(TestCase):

    def setUp(self):
        self.password = "abc123"
        self.facility = FacilityFactory.create()
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.user.set_password(self.password)
        self.user.save()
        self.client = Client()

    def test(self):
        self.assertTrue(self.client.login(username=self.user.username, password=self.password, facility=self.facility))
