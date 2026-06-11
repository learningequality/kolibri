import uuid

from django.urls import reverse
from mock import patch
from rest_framework import status
from rest_framework.test import APIClient
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
    databases = "__all__"

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


class CSRFProtectedSetupTestCase(APITestCase):
    def setUp(self):
        provision_device()
        clear_process_cache()
        self.client_csrf = APIClient(enforce_csrf_checks=True)

    # Only testing for one endpoint, as the CSRF protection is applied to all endpoints
    def test_csrf_protected_facilityimport(self):
        response = self.client_csrf.post(
            reverse(
                "kolibri:kolibri.plugins.setup_wizard:facilityimport-createsuperuser"
            ),
            {
                "username": "new_superuser",
                "password": "password",
                "full_name": "Super User",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_csrf_protected_setupwizard(self):
        # passing and empty dictionary as data as i don't know what is baseurl
        response = self.client_csrf.post(
            reverse(
                "kolibri:kolibri.plugins.setup_wizard:setupwizard-createuseronremote"
            ),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class CreateUserOnRemoteTestCase(APITestCase):
    url = "kolibri:kolibri.plugins.setup_wizard:setupwizard-createuseronremote"

    def setUp(self):
        clear_process_cache()

    def _post(self, upstream_status, upstream_json, json_raises=None):
        with patch(
            "kolibri.plugins.setup_wizard.viewsets.setup_wizard.NetworkClient"
        ) as NetworkClient:
            client = NetworkClient.build_for_address.return_value
            client.post.return_value.status_code = upstream_status
            if json_raises is not None:
                client.post.return_value.json.side_effect = json_raises
            else:
                client.post.return_value.json.return_value = upstream_json
            return self.client.post(
                reverse(self.url),
                {
                    "baseurl": "http://remote.example",
                    "facility_id": uuid.uuid4().hex,
                    "username": "alice",
                    "password": "p",
                    "full_name": "Alice",
                },
                format="json",
            )

    def test_success_response_does_not_reflect_remote_body(self):
        response = self._post(
            201, {"id": uuid.uuid4().hex, "username": "alice", "secret": "AKIA..."}
        )
        self.assertEqual(response.data, {"status": 201, "errors": []})

    def test_error_response_is_sanitized_to_id_only(self):
        response = self._post(
            400,
            [
                {
                    "id": "USERNAME_ALREADY_EXISTS",
                    "metadata": {"smuggled": "AKIA..."},
                }
            ],
        )
        self.assertEqual(
            response.data,
            {"status": 400, "errors": [{"id": "USERNAME_ALREADY_EXISTS"}]},
        )

    def test_non_list_error_response_returns_empty_errors(self):
        response = self._post(500, {"detail": "leaked", "secret": "AKIA..."})
        self.assertEqual(response.data, {"status": 500, "errors": []})

    def test_any_invalid_error_item_rejects_whole_response(self):
        response = self._post(400, [{"id": "USERNAME_ALREADY_EXISTS"}, "not a dict"])
        self.assertEqual(response.data, {"status": 400, "errors": []})

    def test_non_json_response_returns_empty_errors(self):
        response = self._post(500, None, json_raises=ValueError("not JSON"))
        self.assertEqual(response.data, {"status": 500, "errors": []})
