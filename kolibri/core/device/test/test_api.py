from kolibri.auth.test.helpers import provision_device
from kolibri.auth.models import Facility, FacilityDataset, FacilityUser
from kolibri.core.device.models import DevicePermissions

from django.core.urlresolvers import reverse

from rest_framework import status
from rest_framework.test import APITestCase

class DeviceProvisionTestCase(APITestCase):

    superuser_data = {"username": "superuser", "password": "password"}
    facility_data = {"name": "Wilson Elementary"}
    dataset_data = {
        "description": "",
        "location": "Somewhere over the rainbow",
        "learner_can_edit_username": True,
        "learner_can_edit_name": True,
        "learner_can_edit_password": True,
        "learner_can_sign_up": True,
        "learner_can_delete_account": True,
        "learner_can_login_with_no_password": False,
    }

    language_code = "en"

    def test_cannot_post_if_provisioned(self):
        provision_device()
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "dataset": self.dataset_data,
            "language_code": self.language_code,
        }
        response = self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "dataset": self.dataset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(FacilityUser.objects.get().username, self.superuser_data["username"])

    def test_superuser_device_permissions_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "dataset": self.dataset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(DevicePermissions.objects.get(), FacilityUser.objects.get().devicepermissions)

    def test_facility_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "dataset": self.dataset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(Facility.objects.get().name, self.facility_data["name"])

    def test_dataset_set_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "dataset": self.dataset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(FacilityDataset.objects.get().location, self.dataset_data["location"])
