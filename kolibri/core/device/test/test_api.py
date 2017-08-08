from kolibri.auth.constants.role_kinds import ADMIN
from kolibri.auth.test.helpers import provision_device
from kolibri.auth.models import Facility, FacilityDataset, FacilityUser, Role
from kolibri.core.device.models import DevicePermissions

from django.core.urlresolvers import reverse

from rest_framework import status
from rest_framework.test import APITestCase

class DeviceProvisionTestCase(APITestCase):

    superuser_data = {"username": "superuser", "password": "password"}
    facility_data = {"name": "Wilson Elementary"}
    preset_data = "nonformal"
    dataset_data = {
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
            "preset": self.preset_data,
            "language_code": self.language_code,
        }
        response = self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(FacilityUser.objects.get().username, self.superuser_data["username"])

    def test_superuser_device_permissions_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(DevicePermissions.objects.get(), FacilityUser.objects.get().devicepermissions)

    def test_facility_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(Facility.objects.get().name, self.facility_data["name"])

    def test_admin_role_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(Role.objects.get().kind, ADMIN)

    def test_facility_role_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(Role.objects.get().collection.name, self.facility_data["name"])

    def test_dataset_set_created(self):
        data = {
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "language_code": self.language_code,
        }
        self.client.post(reverse('deviceprovision'), data, format="json")
        self.assertEqual(FacilityDataset.objects.get().learner_can_edit_username, self.dataset_data["learner_can_edit_username"])
        self.assertEqual(FacilityDataset.objects.get().learner_can_edit_name, self.dataset_data["learner_can_edit_name"])
        self.assertEqual(FacilityDataset.objects.get().learner_can_edit_password, self.dataset_data["learner_can_edit_password"])
        self.assertEqual(FacilityDataset.objects.get().learner_can_sign_up, self.dataset_data["learner_can_sign_up"])
        self.assertEqual(FacilityDataset.objects.get().learner_can_delete_account, self.dataset_data["learner_can_delete_account"])
        self.assertEqual(FacilityDataset.objects.get().learner_can_login_with_no_password, self.dataset_data["learner_can_login_with_no_password"])
