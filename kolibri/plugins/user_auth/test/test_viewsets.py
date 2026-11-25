from django.urls import reverse

from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import create_os_user
from kolibri.core.auth.test.helpers import create_privileged_os_users
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.login_tokens import login_tokens
from kolibri.core.device.login_tokens import OSUserInfo
from kolibri.core.device.models import DeviceAppKey
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import APP_AUTH_TOKEN_COOKIE_NAME
from kolibri.core.device.utils import APP_KEY_COOKIE_NAME
from kolibri.core.device.utils import set_device_settings
from kolibri.core.utils.test.helpers import encode_cursor


class FacilityUsernameViewSetTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.facility.dataset.learner_can_login_with_no_password = True
        cls.facility.dataset.learner_can_edit_password = False
        cls.facility.dataset.save()
        # 25 learner users with no roles so they pass the queryset filter
        cls.users = [
            FacilityUserFactory.create(
                facility=cls.facility, username=f"testuser{i:02d}"
            )
            for i in range(25)
        ]

    def url(self):
        return reverse("kolibri:kolibri.plugins.user_auth:facilityusername-list")

    def test_list_returns_paginated_shape(self):
        response = self.client.get(
            self.url(),
            {"facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        self.assertIn("more", response.data)

    def test_default_page_size_is_10(self):
        response = self.client.get(
            self.url(),
            {"facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 10)

    def test_max_results_above_maximum(self):
        response = self.client.get(
            self.url(),
            {"facility": self.facility.id, "max_results": 21},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data[0]["metadata"]["field"], "max_results")

    def test_max_results_at_maximum(self):
        response = self.client.get(
            self.url(),
            {"facility": self.facility.id, "max_results": 20},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 20)

    def _list_with_cursor_position(self, position):
        return self.client.get(
            self.url(),
            {"facility": self.facility.id, "cursor": encode_cursor(p=position)},
            format="json",
        )

    def test_cursor_position_resumes_after_username(self):
        response = self._list_with_cursor_position("testuser04")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["username"], "testuser05")

    def test_null_character_cursor_position_returns_400(self):
        response = self._list_with_cursor_position("\x00")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data[0]["metadata"]["field"], "cursor")

    def test_excludes_privileged_users(self):
        admin = FacilityUserFactory.create(facility=self.facility, username="admin")
        self.facility.add_admin(admin)
        create_superuser(self.facility, username="superuser")
        content_manager = FacilityUserFactory.create(
            facility=self.facility, username="content_manager"
        )
        DevicePermissions.objects.create(user=content_manager, can_manage_content=True)
        response = self.client.get(
            self.url(),
            {"facility": self.facility.id, "max_results": 20},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        usernames = [item["username"] for item in response.data["results"]]
        self.assertEqual(usernames, [user.username for user in self.users[:20]])

    def test_short_search_returns_400(self):
        for search in ("a", "te"):
            with self.subTest(search=search):
                response = self.client.get(
                    self.url(),
                    {"facility": self.facility.id, "search": search},
                    format="json",
                )
                self.assertEqual(response.status_code, 400)

    def test_valid_search_returns_paginated_results(self):
        response = self.client.get(
            self.url(),
            {"facility": self.facility.id, "search": "tes"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("results", response.data)
        for item in response.data["results"]:
            self.assertIn("username", item)
            self.assertTrue(item["username"].startswith("tes"))


class FacilityUsernameOSUserTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()

    def _get(self, os_username, app_key=True):
        if app_key:
            self.client.cookies[APP_KEY_COOKIE_NAME] = DeviceAppKey.get_app_key()
        self.client.cookies[APP_AUTH_TOKEN_COOKIE_NAME] = (
            login_tokens.generate_for_user(
                OSUserInfo(os_username, os_username, "", False)
            )
        )
        return self.client.get(
            reverse("kolibri:kolibri.plugins.user_auth:facilityusername-osuser")
        )

    def test_returns_privileged_os_user_on_full_facility_device(self):
        for user in create_privileged_os_users(self.facility):
            with self.subTest(username=user.username):
                response = self._get(user.os_user.os_username)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    response.data,
                    {"username": user.username, "facility": self.facility.id},
                )

    def test_not_found_for_os_user_signed_in_without_password(self):
        learner = create_os_user(self.facility, "os_learner")
        self.assertEqual(self._get(learner.os_user.os_username).status_code, 404)

    def test_not_found_on_learner_only_device(self):
        admin = create_os_user(self.facility, "os_admin")
        self.facility.add_admin(admin)
        set_device_settings(subset_of_users_device=True)
        self.addCleanup(clear_process_cache)
        self.assertEqual(self._get(admin.os_user.os_username).status_code, 404)

    def test_not_found_without_app_key(self):
        admin = create_os_user(self.facility, "os_admin")
        self.facility.add_admin(admin)
        self.assertEqual(
            self._get(admin.os_user.os_username, app_key=False).status_code, 404
        )

    def test_not_found_for_unknown_os_user(self):
        self.assertEqual(self._get("nobody").status_code, 404)
