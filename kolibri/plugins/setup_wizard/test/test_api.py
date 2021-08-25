from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import create_dummy_facility_data
from kolibri.core.auth.test.helpers import provision_device


class GetFacilityAdminsTest(APITestCase):
    def setUp(self):
        clear_process_cache()
        create_dummy_facility_data(classroom_count=1)

    def _make_request(self):
        return self.client.get(
            reverse(
                "kolibri:kolibri.plugins.setup_wizard:facilityimport-facilityadmins"
            ),
            format="json",
        )

    def test_fails_if_device_provisioned(self):
        provision_device()
        response = self._make_request()
        self.assertEqual(response.status_code, 403)

    def test_only_returns_admins(self):
        response = self._make_request()
        sorted_admins = sorted(response.data, key=lambda x: x["username"])
        self.assertEqual(sorted_admins[0]["username"], "facadmin")


class GrantSuperuserPermissionsTest(APITestCase):
    def setUp(self):
        clear_process_cache()

        facility_data = create_dummy_facility_data(classroom_count=1)
        self.admin = facility_data["facility_admin"]
        self.admin.set_password("password")
        self.admin.save()
        self.coach = facility_data["classroom_coaches"][0]
        self.coach.set_password("password")
        self.coach.save()

    def _make_request(self, data):
        return self.client.post(
            reverse(
                "kolibri:kolibri.plugins.setup_wizard:facilityimport-grantsuperuserpermissions"
            ),
            data,
            format="json",
        )

    def test_fails_if_device_provisioned(self):
        provision_device()
        response = self._make_request(
            {"user_id": self.admin.id, "password": "password"}
        )
        self.assertEqual(response.status_code, 403)

    def test_fails_if_user_not_found(self):
        id_copy = self.admin.id
        self.admin.delete()
        response = self._make_request({"user_id": id_copy, "password": "password"})
        self.assertEqual(response.status_code, 404)

    def test_fails_if_password_invalid(self):
        response = self._make_request(
            {"user_id": self.admin.id, "password": "passward"}
        )
        self.assertEqual(response.status_code, 403)

    def test_fails_if_user_not_admin(self):
        response = self._make_request(
            {"user_id": self.coach.id, "password": "password"}
        )
        self.assertEqual(response.status_code, 403)

    def test_successfully_adds_device_permissions(self):
        response = self._make_request(
            {"user_id": self.admin.id, "password": "password"}
        )
        self.assertEqual(response.status_code, 200)


class CreateSuperuserTest(APITestCase):
    def setUp(self):
        clear_process_cache()

        facility_data = create_dummy_facility_data(classroom_count=1)
        self.admin = facility_data["facility_admin"]
        self.admin.set_password("password")
        self.admin.save()
        self.coach = facility_data["classroom_coaches"][0]
        self.coach.set_password("password")
        self.coach.save()

    def _make_request(self, data):
        return self.client.post(
            reverse(
                "kolibri:kolibri.plugins.setup_wizard:facilityimport-createsuperuser"
            ),
            data,
            format="json",
        )

    def test_successfully_adds_device_permissions(self):
        response = self._make_request(
            {
                "username": "new_superuser",
                "password": "password",
                "full_name": "Super User",
            }
        )
        self.assertEqual(response.status_code, 200)
        superuser = FacilityUser.objects.get(username="new_superuser")
        self.assertTrue(superuser.is_superuser)
