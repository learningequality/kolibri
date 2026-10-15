from django.urls import reverse

from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
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
