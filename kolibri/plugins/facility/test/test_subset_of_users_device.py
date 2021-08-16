from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from mock import patch
from rest_framework.test import APITestCase

from kolibri.core.auth.test.helpers import provision_device
from kolibri.plugins.facility.kolibri_plugin import FacilityManagementPlugin


class FacilityOnSoUDTestCase(APITestCase):
    def setUp(self):
        provision_device()

    def test_urls_on_not_soud(self):
        with patch(
            "kolibri.plugins.facility.kolibri_plugin.get_device_setting",
            return_value=False,
        ):
            self.assertIsNotNone(FacilityManagementPlugin().translated_view_urls)

    def test_no_urls_on_soud(self):
        with patch(
            "kolibri.plugins.facility.kolibri_plugin.get_device_setting",
            return_value=True,
        ):
            self.assertIsNone(FacilityManagementPlugin().translated_view_urls)
