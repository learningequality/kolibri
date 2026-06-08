from django.urls import reverse

from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory


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
                facility=cls.facility, username="testuser{:02d}".format(i)
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

    def test_max_results_clamped_to_20(self):
        response = self.client.get(
            self.url(),
            {"facility": self.facility.id, "max_results": 100},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        # 25 users in setUp; requesting 100, clamped to 20 — must get exactly 20
        self.assertEqual(len(response.data["results"]), 20)

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
