import factory
from django.test import TestCase
from django.urls import reverse
from mock import patch
from rest_framework import status

from .. import models
from ..constants import role_kinds
from ..serializers import PublicFacilitySerializer
from .helpers import create_superuser
from .helpers import disable_qr_login
from .helpers import DUMMY_PASSWORD
from .helpers import enable_qr_login
from .helpers import KolibriAPITestCase as APITestCase
from .helpers import provision_device
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.tasks.job import Job


class FacilityFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Facility

    name = factory.Sequence(lambda n: "QR Viewset Facility #%d" % n)


class FacilityUserFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: "qrviewsetuser%d" % n)
    password = factory.PostGenerationMethodCall("set_password", DUMMY_PASSWORD)


class FacilityUserSerializerQRTokenTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = models.Facility.objects.create(name="QRSerializerFacility")
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
        enable_qr_login(self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _create_user_via_api(self, username="newlearner"):
        url = reverse("kolibri:core:facilityuser-list")
        return self.client.post(
            url,
            {
                "username": username,
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )

    def test_new_learner_gets_qr_token_when_feature_enabled(self):
        response = self._create_user_via_api()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = models.FacilityUser.objects.get(id=response.data["id"])
        self.assertIsNotNone(user.qr_login_token)
        self.assertGreaterEqual(len(user.qr_login_token), 16)

    def test_new_learner_no_qr_token_when_feature_disabled(self):
        disable_qr_login(self.facility)
        response = self._create_user_via_api()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = models.FacilityUser.objects.get(id=response.data["id"])
        self.assertIsNone(user.qr_login_token)

    def test_qr_token_is_read_only(self):
        response = self._create_user_via_api()
        user = models.FacilityUser.objects.get(id=response.data["id"])
        original_token = user.qr_login_token
        self.assertIsNotNone(original_token)

        url = reverse("kolibri:core:facilityuser-detail", kwargs={"pk": user.id})
        response = self.client.patch(
            url,
            {"qr_login_token": "x" * 43},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.qr_login_token, original_token)


class SaveFacilityLoginSettingsQRTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)

    def _url(self):
        return reverse(
            "kolibri:core:facilitydataset-save-facility-login-settings",
            kwargs={"pk": self.facility.dataset_id},
        )

    def _setup_task_mocks(self, mock_storage, mock_task):
        mock_job = Job(func="test_func", facility_id=self.facility.id)
        mock_task.validate_job_data.return_value = (mock_job, {})
        mock_task.enqueue.return_value = "test-job-id"
        mock_enqueued_job = Job(func="test_func", facility_id=self.facility.id)
        mock_enqueued_job.job_id = "test-job-id"
        mock_storage.get_job.return_value = mock_enqueued_job

    @patch("kolibri.core.auth.api.assign_qr_login_tokens_to_facility")
    @patch("kolibri.core.auth.api.job_storage")
    def test_enable_qr_login_enqueues_task(self, mock_storage, mock_task):
        self._setup_task_mocks(mock_storage, mock_task)
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            self._url(),
            {"enable_qr_login": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(response.data["task"]["id"], "test-job-id")
        self.assertTrue(response.data["dataset"]["enable_qr_login"])
        mock_task.validate_job_data.assert_called_once()
        mock_task.enqueue.assert_called_once()
        dataset = FacilityDataset.objects.get(pk=self.facility.dataset_id)
        self.assertTrue(dataset.enable_qr_login)

    @patch("kolibri.core.auth.api.assign_qr_login_tokens_to_facility")
    @patch("kolibri.core.auth.api.job_storage")
    def test_enable_qr_login_does_not_call_task_directly(self, mock_storage, mock_task):
        self._setup_task_mocks(mock_storage, mock_task)
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        self.client.patch(
            self._url(),
            {"enable_qr_login": True},
            format="json",
        )
        mock_task.assert_not_called()

    @patch("kolibri.core.auth.api.assign_qr_login_tokens_to_facility")
    def test_disable_qr_login_just_clears_flag(self, mock_task):
        dataset = self.facility.dataset
        dataset.enable_qr_login = True
        dataset.save()
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            self._url(),
            {"enable_qr_login": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_task.validate_job_data.assert_not_called()
        mock_task.enqueue.assert_not_called()
        dataset.refresh_from_db()
        self.assertFalse(dataset.enable_qr_login)


class PublicFacilitySerializerQRTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = models.Facility.objects.create(name="PublicQRFacility")

    def test_includes_enable_qr_login_field(self):
        self.facility.dataset.enable_qr_login = True
        self.facility.dataset.save()
        serializer = PublicFacilitySerializer(self.facility)
        self.assertIn("enable_qr_login", serializer.data)
        self.assertTrue(serializer.data["enable_qr_login"])

    def test_enable_qr_login_defaults_to_false(self):
        serializer = PublicFacilitySerializer(self.facility)
        self.assertIn("enable_qr_login", serializer.data)
        self.assertFalse(serializer.data["enable_qr_login"])


class RoleViewSetQRTokenTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = models.Facility.objects.create(name="RoleViewsetQRFacility")
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
        enable_qr_login(self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_creating_role_clears_qr_login_token(self):
        learner = FacilityUserFactory.create(facility=self.facility)
        learner.qr_login_token = "a" * 43
        learner.save(update_fields=["qr_login_token"])
        self.assertIsNotNone(learner.qr_login_token)

        url = reverse("kolibri:core:role-list")
        response = self.client.post(
            url,
            {
                "user": learner.id,
                "collection": self.facility.id,
                "kind": role_kinds.ADMIN,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        learner.refresh_from_db()
        self.assertIsNone(learner.qr_login_token)

    def test_bulk_role_creation_clears_qr_login_token(self):
        learner1 = FacilityUserFactory.create(facility=self.facility)
        learner1.qr_login_token = "b" * 43
        learner1.save(update_fields=["qr_login_token"])
        learner2 = FacilityUserFactory.create(facility=self.facility)
        learner2.qr_login_token = "c" * 43
        learner2.save(update_fields=["qr_login_token"])

        url = reverse("kolibri:core:role-list")
        response = self.client.post(
            url,
            [
                {
                    "user": learner1.id,
                    "collection": self.facility.id,
                    "kind": role_kinds.ADMIN,
                },
                {
                    "user": learner2.id,
                    "collection": self.facility.id,
                    "kind": role_kinds.ADMIN,
                },
            ],
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        learner1.refresh_from_db()
        learner2.refresh_from_db()
        self.assertIsNone(learner1.qr_login_token)
        self.assertIsNone(learner2.qr_login_token)
