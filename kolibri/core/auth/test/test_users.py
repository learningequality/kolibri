from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.test import TestCase

from ..models import Facility
from ..models import FacilityUser
from .helpers import create_superuser


class UserSanityTestCase(TestCase):
    """
    Sanity checks basic functionality of user models.
    """

    def test_facility_user(self):
        self.facility = Facility.objects.create()
        self.user = FacilityUser.objects.create(
            username="mike",
            full_name="Mike Gallaspy",
            password="###",
            facility=self.facility,
        )
        self.do = create_superuser(self.facility)
        self.assertFalse(self.user.is_superuser)
        self.assertTrue(self.do.is_superuser)
        self.assertEqual(self.user.get_short_name(), "Mike")
