from django.urls import reverse

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import DUMMY_PASSWORD
from kolibri.core.auth.test.helpers import KolibriAPITestCase as APITestCase
from kolibri.core.auth.test.helpers import setup_device
from kolibri.core.utils.token_generator import TokenGenerator


class OnMyOwnSetupViewsetTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility, _ = setup_device()
        cls.user = FacilityUser.objects.create(
            username="testuser", facility=cls.facility
        )
        cls.user.set_password(DUMMY_PASSWORD)
        cls.user.save()
        cls.omo_facility = Facility.objects.create(name="On My Own")
        cls.omo_facility.on_my_own_setup = True
        cls.omo_facility.save()
        cls.omo_user = FacilityUser.objects.create(
            username="omouser", facility=cls.omo_facility
        )
        cls.omo_user.set_password(DUMMY_PASSWORD)
        cls.omo_user.save()

    def setUp(self):
        self.url = reverse("kolibri:kolibri.plugins.user_profile:onmyownsetup")

    def test_anonymous_user_denied(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_authenticated_user_returns_on_my_own_setup_false_by_default(self):
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["on_my_own_setup"])

    def test_authenticated_user_returns_on_my_own_setup_true_when_set(self):
        self.client.login(
            username=self.omo_user.username,
            password=DUMMY_PASSWORD,
            facility=self.omo_facility,
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["on_my_own_setup"])


class LoginMergedUserViewsetTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility, _ = setup_device()
        cls.user = FacilityUser.objects.create(
            username="mergeduser", facility=cls.facility
        )

    def setUp(self):
        self.url = reverse("kolibri:kolibri.plugins.user_profile:loginmergeduser")
        self.token = TokenGenerator().make_token(self.user.id)

    def test_login_with_valid_token_succeeds(self):
        response = self.client.post(
            self.url,
            {"pk": str(self.user.pk), "token": self.token},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])

    def test_login_with_invalid_token_returns_401(self):
        response = self.client.post(
            self.url,
            {"pk": str(self.user.pk), "token": "invalid-token"},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
