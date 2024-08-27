import base64
import collections
import time
import uuid
from datetime import datetime
from datetime import timedelta
from importlib import import_module

import factory
from django.conf import settings
from django.urls import reverse
from django.utils import timezone
from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.models import SyncSession
from morango.models import TransferSession
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.test import APITestCase

from .. import models
from ..constants import role_kinds
from ..constants.facility_presets import mappings
from ..models import Facility
from .helpers import create_superuser
from .helpers import DUMMY_PASSWORD
from .helpers import provision_device
from kolibri.core import error_constants
from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.constants import demographics
from kolibri.core.device.models import OSUser
from kolibri.core.device.utils import set_device_settings


class FacilityFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Facility

    name = factory.Sequence(lambda n: "Rock N' Roll High School #%d" % n)


class ClassroomFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.Classroom

    name = factory.Sequence(lambda n: "Basic Rock Theory #%d" % n)


class LearnerGroupFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.LearnerGroup

    name = factory.Sequence(lambda n: "Group #%d" % n)


class FacilityUserFactory(factory.DjangoModelFactory):
    class Meta:
        model = models.FacilityUser

    facility = factory.SubFactory(FacilityFactory)
    username = factory.Sequence(lambda n: "user%d" % n)
    password = factory.PostGenerationMethodCall("set_password", DUMMY_PASSWORD)


class LearnerGroupAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.classrooms = [
            ClassroomFactory.create(parent=cls.facility) for _ in range(3)
        ]
        cls.learner_groups = []
        for classroom in cls.classrooms:
            cls.learner_groups += [
                LearnerGroupFactory.create(parent=classroom) for _ in range(5)
            ]
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def login_superuser(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_learnergroup_list(self):
        self.login_superuser()
        response = self.client.get(
            reverse("kolibri:core:learnergroup-list"), format="json"
        )
        expected = [
            collections.OrderedDict(
                (
                    ("id", group.id),
                    ("name", group.name),
                    ("parent", group.parent.id),
                    ("user_ids", [member.id for member in group.get_members()]),
                )
            )
            for group in self.learner_groups
        ]
        for i, group in enumerate(response.data):
            self.assertCountEqual(group.pop("user_ids"), expected[i].pop("user_ids"))
        self.assertCountEqual(response.data, expected)

    def test_learnergroup_list_user(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse("kolibri:core:learnergroup-list"), format="json"
        )
        expected = []
        self.assertCountEqual(response.data, expected)

    def test_learnergroup_list_user_parent_filter(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse("kolibri:core:learnergroup-list")
            + "?parent="
            + self.classrooms[0].id,
            format="json",
        )
        expected = []
        self.assertCountEqual(response.data, expected)

    def test_learnergroup_detail(self):
        self.login_superuser()
        response = self.client.get(
            reverse(
                "kolibri:core:learnergroup-detail",
                kwargs={"pk": self.learner_groups[0].id},
            ),
            format="json",
        )
        expected = {
            "id": self.learner_groups[0].id,
            "name": self.learner_groups[0].name,
            "parent": self.learner_groups[0].parent.id,
            "user_ids": [member.id for member in self.learner_groups[0].get_members()],
        }
        self.assertCountEqual(response.data, expected)

    def test_learnergroup_detail_user(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:core:learnergroup-detail",
                kwargs={"pk": self.learner_groups[0].id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_parent_in_queryparam_with_one_id(self):
        self.login_superuser()
        classroom_id = self.classrooms[0].id
        response = self.client.get(
            reverse("kolibri:core:learnergroup-list"),
            {"parent": classroom_id},
            format="json",
        )
        expected = [
            collections.OrderedDict(
                (
                    ("id", group.id),
                    ("name", group.name),
                    ("parent", group.parent.id),
                    ("user_ids", [member.id for member in group.get_members()]),
                )
            )
            for group in self.learner_groups
            if group.parent.id == classroom_id
        ]
        # assertCountEqual does not deal well with embedded objects, as it does
        # not do a deepEqual, so check each individual list of user_ids
        for i, group in enumerate(response.data):
            self.assertCountEqual(group.pop("user_ids"), expected[i].pop("user_ids"))
        self.assertCountEqual(response.data, expected)

    def test_cannot_create_learnergroup_same_name(self):
        self.login_superuser()
        classroom_id = self.classrooms[0].id
        learner_group_name = (
            models.LearnerGroup.objects.filter(parent_id=classroom_id).first().name
        )
        response = self.client.post(
            reverse("kolibri:core:learnergroup-list"),
            {"parent": classroom_id, "name": learner_group_name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_cannot_create_learnergroup_no_classroom_parent(self):
        self.login_superuser()
        classroom_id = self.classrooms[0].id
        learner_group_id = (
            models.LearnerGroup.objects.filter(parent_id=classroom_id).first().id
        )
        response = self.client.post(
            reverse("kolibri:core:learnergroup-list"),
            {"parent": learner_group_id, "name": "some name"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ClassroomAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.classrooms = [
            ClassroomFactory.create(parent=cls.facility) for _ in range(10)
        ]
        cls.learner_group = LearnerGroupFactory.create(parent=cls.classrooms[0])
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def login_superuser(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_classroom_list(self):
        self.login_superuser()
        response = self.client.get(
            reverse("kolibri:core:classroom-list"), format="json"
        )
        expected = [
            collections.OrderedDict(
                (
                    ("id", classroom.id),
                    ("name", classroom.name),
                    ("parent", classroom.parent.id),
                    ("learner_count", 0),
                    ("coaches", []),
                )
            )
            for classroom in sorted(self.classrooms, key=lambda x: x.id)
        ]
        self.assertCountEqual(response.data, expected)

    def test_classroom_list_user(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse("kolibri:core:classroom-list"), format="json"
        )
        self.assertCountEqual(response.data, [])

    def test_classroom_list_user_parent_filter(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse("kolibri:core:classroom-list") + "?parent=" + self.facility.id,
            format="json",
        )
        self.assertCountEqual(response.data, [])

    def test_classroom_detail(self):
        self.login_superuser()
        response = self.client.get(
            reverse(
                "kolibri:core:classroom-detail", kwargs={"pk": self.classrooms[0].id}
            ),
            format="json",
        )
        expected = {
            "id": self.classrooms[0].id,
            "name": self.classrooms[0].name,
            "parent": self.classrooms[0].parent.id,
            "learner_count": 0,
            "coaches": [],
        }
        self.assertDictEqual(response.data, expected)

    def test_classroom_detail_user(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:core:classroom-detail", kwargs={"pk": self.classrooms[0].id}
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_classroom_detail_assigned_coach_super_user(self):
        self.login_superuser()
        self.classrooms[0].add_coach(self.superuser)
        response = self.client.get(
            reverse(
                "kolibri:core:classroom-detail", kwargs={"pk": self.classrooms[0].id}
            ),
            format="json",
        )
        expected = {
            "id": self.classrooms[0].id,
            "name": self.classrooms[0].name,
            "parent": self.classrooms[0].parent.id,
            "learner_count": 0,
            "coaches": [
                {
                    "id": self.superuser.id,
                    "facility": self.facility.id,
                    "is_superuser": True,
                    "full_name": self.superuser.full_name,
                    "username": self.superuser.username,
                    "roles": [
                        {
                            "collection": self.facility.id,
                            "kind": role_kinds.ASSIGNABLE_COACH,
                            "id": self.superuser.roles.get(
                                collection=self.facility.id
                            ).id,
                        }
                    ],
                }
            ],
        }
        self.assertDictEqual(response.data, expected)

    def test_classroom_detail_assigned_coach_admin(self):
        self.login_superuser()
        admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(admin)
        self.classrooms[0].add_coach(admin)
        response = self.client.get(
            reverse(
                "kolibri:core:classroom-detail", kwargs={"pk": self.classrooms[0].id}
            ),
            format="json",
        )
        expected = {
            "id": self.classrooms[0].id,
            "name": self.classrooms[0].name,
            "parent": self.classrooms[0].parent.id,
            "learner_count": 0,
            "coaches": [
                {
                    "id": admin.id,
                    "facility": self.facility.id,
                    "is_superuser": False,
                    "full_name": admin.full_name,
                    "username": admin.username,
                    "roles": [
                        {
                            "collection": self.facility.id,
                            "kind": role_kinds.ADMIN,
                            "id": admin.roles.get(collection=self.facility.id).id,
                        }
                    ],
                }
            ],
        }
        self.assertDictEqual(response.data, expected)

    def test_classroom_facility_coach_role_for_filter(self):
        self.login_superuser()
        coach = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_coach(coach)
        response = self.client.get(
            reverse("kolibri:core:classroom-list"),
            data={"role": "coach"},
            format="json",
        )
        # Should return all classrooms
        self.assertEqual(len(response.data), len(self.classrooms))

    def test_cannot_create_classroom_same_name(self):
        self.login_superuser()
        classroom_name = self.classrooms[0].name
        response = self.client.post(
            reverse("kolibri:core:classroom-list"),
            {"parent": self.facility.id, "name": classroom_name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_cannot_create_classroom_no_facility_parent(self):
        self.login_superuser()
        classroom_id = self.classrooms[0].id
        response = self.client.post(
            reverse("kolibri:core:classroom-list"),
            {"parent": classroom_id, "name": "another name"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FacilityAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility1 = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility1)
        cls.facility2 = FacilityFactory.create()
        cls.user1 = FacilityUserFactory.create(facility=cls.facility1)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility2)
        cls.date_completed_transfer_session = datetime(2022, 6, 30, tzinfo=timezone.utc)
        cls.date_failed_transfer_session = datetime(2022, 6, 14, tzinfo=timezone.utc)
        cls.sync_session = SyncSession.objects.create(
            id=uuid.uuid4().hex,
            profile="facilitydata",
            last_activity_timestamp=cls.date_completed_transfer_session,
        )
        cls.completed_push_transfer_session = TransferSession.objects.create(
            id=uuid.uuid4().hex,
            sync_session_id=cls.sync_session.id,
            filter=cls.facility1.dataset_id,
            push=True,
            active=False,
            transfer_stage=transfer_stages.CLEANUP,
            transfer_stage_status=transfer_statuses.COMPLETED,
            last_activity_timestamp=cls.date_completed_transfer_session,
        )
        cls.failed_transfer_session = TransferSession.objects.create(
            id=uuid.uuid4().hex,
            sync_session_id=cls.sync_session.id,
            filter=cls.facility1.dataset_id,
            push=True,
            transfer_stage_status=transfer_statuses.ERRORED,
            last_activity_timestamp=cls.date_failed_transfer_session,
        )

    def test_sanity(self):
        self.assertTrue(
            self.client.login(
                username=self.user1.username,
                password=DUMMY_PASSWORD,
                facility=self.facility1,
            )
        )

    def test_facility_user_can_get_detail(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.pk}),
            format="json",
        )
        self.assertEqual(
            dict(response.data),
            # Merge smaller dict into larger dict, if the smaller dict is a subset of the larger one, the result should be equal to the larger one
            # Generalized dict unpacking can be used in Python 3.5+: assertEqual(larger_dict, {**larger_dict, **smaller_dict})
            # The dict union operator can be used in Python 3.9+: assertEqual(larger_dict, larger_dict | smaller_dict)
            dict(response.data, **{"name": self.facility1.name}),
        )

    def test_facility_user_can_get_last_successful_sync(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.pk}),
            format="json",
        )
        self.assertEqual(
            response.data["last_successful_sync"],
            self.date_completed_transfer_session,
        )

    def test_facility_user_can_get_last_failed_sync(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.pk}),
            format="json",
        )
        self.assertEqual(
            response.data["last_failed_sync"], self.date_failed_transfer_session
        )

    def test_device_admin_can_create_facility(self):
        new_facility_name = "New Facility"
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        self.assertEqual(
            models.Facility.objects.filter(name=new_facility_name).count(), 0
        )
        response = self.client.post(
            reverse("kolibri:core:facility-list"),
            {"name": new_facility_name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            models.Facility.objects.filter(name=new_facility_name).count(), 1
        )

    def test_facility_user_cannot_create_facility(self):
        new_facility_name = "New Facility"
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        self.assertEqual(
            models.Facility.objects.filter(name=new_facility_name).count(), 0
        )
        response = self.client.post(
            reverse("kolibri:core:facility-list"),
            {"name": new_facility_name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            models.Facility.objects.filter(name=new_facility_name).count(), 0
        )

    def test_anonymous_user_cannot_create_facility(self):
        new_facility_name = "New Facility"
        self.assertEqual(
            models.Facility.objects.filter(name=new_facility_name).count(), 0
        )
        response = self.client.post(
            reverse("kolibri:core:facility-list"),
            {"name": new_facility_name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            models.Facility.objects.filter(name=new_facility_name).count(), 0
        )

    def test_device_admin_can_update_facility(self):
        old_facility_name = self.facility1.name
        new_facility_name = "Renamed Facility"
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        self.assertEqual(
            models.Facility.objects.get(id=self.facility1.id).name, old_facility_name
        )
        response = self.client.put(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.id}),
            {"name": new_facility_name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            models.Facility.objects.get(id=self.facility1.id).name, new_facility_name
        )

    def test_device_admin_can_delete_facility(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        self.assertEqual(
            models.Facility.objects.filter(id=self.facility1.id).count(), 1
        )
        response = self.client.delete(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.id})
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(
            models.Facility.objects.filter(id=self.facility1.id).count(), 0
        )

    def test_public_facility_endpoint(self):
        response = self.client.get(reverse("kolibri:core:publicfacility-list"))
        self.assertEqual(models.Facility.objects.all().count(), len(response.data))

    def test_public_facilityuser_endpoint(self):
        credentials = base64.b64encode(
            str.encode(
                "username={}&{}={}:{}".format(
                    self.user1.username,
                    FACILITY_CREDENTIAL_KEY,
                    self.facility1.id,
                    DUMMY_PASSWORD,
                )
            )
        ).decode("ascii")
        self.client.credentials(HTTP_AUTHORIZATION="Basic {}".format(credentials))
        response = self.client.get(
            reverse("kolibri:core:publicuser-list"),
            format="json",
        )
        self.assertEqual(len(response.data), 1)
        credentials = base64.b64encode(
            str.encode(
                "username={}&{}={}:{}".format(
                    self.superuser.username,
                    FACILITY_CREDENTIAL_KEY,
                    self.facility1.id,
                    DUMMY_PASSWORD,
                )
            )
        ).decode("ascii")
        self.client.credentials(HTTP_AUTHORIZATION="Basic {}".format(credentials))
        response = self.client.get(
            reverse("kolibri:core:publicuser-list"),
            {"facility_id": self.facility1.id},
            format="json",
        )
        self.assertEqual(
            models.FacilityUser.objects.filter(facility_id=self.facility1.id).count(),
            len(response.data),
        )
        for item in response.data:
            self.assertEqual(
                self.facility1.id,
                item["facility"],
            )

    def test_create_new_facility_non_superuser_permission_denied(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.post(reverse("kolibri:core:facility-create-facility"))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_create_new_facility_empty_data_fails(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.post(
            reverse("kolibri:core:facility-create-facility"), data={}
        )
        response_data = response.json()
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        missing_name = {
            "id": "REQUIRED",
            "metadata": {"field": "name", "message": "This field is required."},
        }
        missing_preset = {
            "id": "REQUIRED",
            "metadata": {"field": "name", "message": "This field is required."},
        }
        assert missing_name in response_data
        assert missing_preset in response_data

    def test_create_new_facility_invalid_preset_option_fails(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        data = {"name": "formal facility", "preset": "invalid"}
        response = self.client.post(
            reverse("kolibri:core:facility-create-facility"), data=data
        )
        response_data = response.json()
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response_data[0]["id"] == "INVALID_CHOICE"
        assert response_data[0]["metadata"]["field"] == "preset"

    def test_create_new_facility_valid_data_preset_formal(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        data = {"name": "formal facility", "preset": "formal"}
        response = self.client.post(
            reverse("kolibri:core:facility-create-facility"), data=data
        )
        assert response.status_code == status.HTTP_200_OK

        # Test that correct preset is saved
        facility = Facility.objects.get(name=data["name"])
        assert facility.dataset.preset == data["preset"]

        # Test that setting have been applied based on the preset
        dataset = facility.dataset
        assert dataset.learner_can_edit_username is False
        assert dataset.learner_can_edit_name is False
        assert dataset.learner_can_edit_password is False
        assert dataset.learner_can_sign_up is False
        assert dataset.learner_can_delete_account is False
        assert dataset.learner_can_login_with_no_password is True
        assert dataset.show_download_button_in_learn is False

    def test_create_new_facility_valid_data_preset_nonformal(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        data = {"name": "non-formal facility", "preset": "nonformal"}
        response = self.client.post(
            reverse("kolibri:core:facility-create-facility"), data=data
        )
        assert response.status_code == status.HTTP_200_OK

        # Test that correct preset is saved
        facility = Facility.objects.get(name=data["name"])
        assert facility.dataset.preset == data["preset"]

        # Test that setting have been applied based on the preset
        dataset = facility.dataset
        assert dataset.learner_can_edit_username is True
        assert dataset.learner_can_edit_name is True
        assert dataset.learner_can_edit_password is True
        assert dataset.learner_can_sign_up is True
        assert dataset.learner_can_delete_account is True
        assert dataset.learner_can_login_with_no_password is False
        assert dataset.show_download_button_in_learn is True


def _add_demographic_schema_to_facility(facility):
    facility.dataset.extra_fields.update(
        {
            models.DEMOGRAPHIC_FIELDS_KEY: [
                {
                    "id": "status",
                    "description": "Up or Down",
                    "enumValues": [
                        {
                            "value": "up",
                            "defaultLabel": "Up",
                            "translations": [{"language": "en", "message": "Up"}],
                        },
                        {
                            "value": "down",
                            "defaultLabel": "Down",
                            "translations": [{"language": "en", "message": "Down"}],
                        },
                    ],
                    "translations": [{"language": "en", "message": "Up or Down"}],
                }
            ]
        }
    )
    facility.dataset.save()


class UserCreationTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_creating_facility_user_via_api_sets_password_correctly(self):
        new_username = "goliath"
        new_password = "davidsucks"
        bad_password = "ilovedavid"
        data = {
            "username": new_username,
            "password": new_password,
            "facility": self.facility.id,
        }
        response = self.client.post(
            reverse("kolibri:core:facilityuser-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            models.FacilityUser.objects.get(username=new_username).check_password(
                new_password
            )
        )
        self.assertFalse(
            models.FacilityUser.objects.get(username=new_username).check_password(
                bad_password
            )
        )

    def test_creating_same_facility_user_throws_400_error(self):
        new_username = "goliath"
        new_password = "davidsucks"
        data = {
            "username": new_username,
            "password": new_password,
            "facility": self.facility.id,
        }
        response = self.client.post(
            reverse("kolibri:core:facilityuser-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        response = self.client.post(
            reverse("kolibri:core:facilityuser-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_creating_user_same_username_case_insensitive(self):
        data = {
            "username": self.superuser.username.upper(),
            "password": DUMMY_PASSWORD,
            "facility": self.facility.id,
        }
        response = self.client.post(
            reverse("kolibri:core:facilityuser-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data[0]["id"], error_constants.USERNAME_ALREADY_EXISTS
        )

    def test_do_not_allow_emails_in_usernames(self):
        data = {
            "username": "bob@learningequality.org",
            "password": DUMMY_PASSWORD,
            "facility": self.facility.id,
        }
        response = self.client.post(
            reverse("kolibri:core:facilityuser-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.INVALID)
        self.assertEqual(response.data[0]["metadata"]["field"], "username")

    def test_max_length_username_in_api(self):
        data = {
            "username": 32 * "gh",
            "password": DUMMY_PASSWORD,
            "facility": self.facility.id,
        }
        response = self.client.post(
            reverse("kolibri:core:facilityuser-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.MAX_LENGTH)
        self.assertEqual(response.data[0]["metadata"]["field"], "username")

    def test_can_add_extra_demographics_to_facility_user(self):
        _add_demographic_schema_to_facility(self.facility)
        data = {
            "username": "goliath",
            "password": "davidsucks",
            "extra_demographics": {"status": "up"},
        }
        response = self.client.post(
            reverse("kolibri:core:facilityuser-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["extra_demographics"], {"status": "up"})

    def test_cant_add_invalid_extra_demographics_to_facility_user(self):
        _add_demographic_schema_to_facility(self.facility)
        data = {
            "username": "goliath",
            "password": "davidsucks",
            "extra_demographics": {"status": "invalid"},
        }
        response = self.client.post(
            reverse("kolibri:core:facilityuser-list"), data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["metadata"]["field"], "extra_demographics")


class UserUpdateTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def tearDown(self):
        self.user.delete()

    def test_user_update_info(self):
        self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"username": "foo"},
            format="json",
        )
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "foo")

    def test_user_update_password(self):
        new_password = "baz"
        self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"password": new_password},
            format="json",
        )
        self.client.logout()
        response = self.client.login(
            username=self.user.username, password=new_password, facility=self.facility
        )
        self.assertTrue(response)

    def test_user_update_password_non_partial_with_username(self):
        new_password = "baz"
        self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"password": new_password, "username": self.user.username},
            format="json",
        )
        self.client.logout()
        response = self.client.login(
            username=self.user.username, password=new_password, facility=self.facility
        )
        self.assertTrue(response)

    def test_updating_user_same_username_case_insensitive(self):
        response = self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"username": self.superuser.username.upper()},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data[0]["id"], error_constants.USERNAME_ALREADY_EXISTS
        )

    def test_updating_same_user_same_username_case_insensitive(self):
        response = self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"username": self.user.username.upper()},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(
            models.FacilityUser.objects.filter(
                username=self.user.username.upper()
            ).exists()
        )

    def test_updating_extra_demographics_previously_none(self):
        _add_demographic_schema_to_facility(self.facility)
        response = self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"extra_demographics": {"status": "up"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["extra_demographics"], {"status": "up"})

    def test_updating_extra_demographics_previously_set(self):
        _add_demographic_schema_to_facility(self.facility)
        self.user.extra_fields = {"status": "down"}
        self.user.save()
        response = self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"extra_demographics": {"status": "up"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["extra_demographics"], {"status": "up"})

    def test_updating_extra_demographics_previously_none_invalid_value(self):
        _add_demographic_schema_to_facility(self.facility)
        response = self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"extra_demographics": {"status": "invalid"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["metadata"]["field"], "extra_demographics")

    def test_updating_extra_demographics_previously_set_invalid_value(self):
        _add_demographic_schema_to_facility(self.facility)
        self.user.extra_fields = {"status": "down"}
        self.user.save()
        response = self.client.patch(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            {"extra_demographics": {"status": "invalid"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["metadata"]["field"], "extra_demographics")


class UserDeleteTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def tearDown(self):
        self.user.delete()

    def test_user_delete(self):
        response = self.client.delete(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, 204)

    def test_superuser_delete_self(self):
        response = self.client.delete(
            reverse(
                "kolibri:core:facilityuser-detail", kwargs={"pk": self.superuser.pk}
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 403)


class UserRetrieveTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.facility.add_admin(cls.superuser)
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def test_user_list(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:facilityuser-list"))
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.data,
            [
                {
                    "id": self.user.id,
                    "username": self.user.username,
                    "full_name": self.user.full_name,
                    "facility": self.user.facility_id,
                    "id_number": self.user.id_number,
                    "gender": self.user.gender,
                    "birth_year": self.user.birth_year,
                    "date_joined": self.user.date_joined,
                    "is_superuser": False,
                    "roles": [],
                    "extra_demographics": None,
                },
                {
                    "id": self.superuser.id,
                    "username": self.superuser.username,
                    "full_name": self.superuser.full_name,
                    "facility": self.superuser.facility_id,
                    "id_number": self.superuser.id_number,
                    "gender": self.superuser.gender,
                    "date_joined": self.superuser.date_joined,
                    "birth_year": self.superuser.birth_year,
                    "is_superuser": True,
                    "roles": [
                        {
                            "collection": self.superuser.roles.first().collection_id,
                            "kind": role_kinds.ADMIN,
                            "id": self.superuser.roles.first().id,
                        }
                    ],
                    "extra_demographics": None,
                },
            ],
        )

    def test_user_list_self(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:facilityuser-list"))
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.data,
            [
                {
                    "id": self.user.id,
                    "username": self.user.username,
                    "full_name": self.user.full_name,
                    "facility": self.user.facility_id,
                    "id_number": self.user.id_number,
                    "gender": self.user.gender,
                    "birth_year": self.user.birth_year,
                    "date_joined": self.user.date_joined,
                    "is_superuser": False,
                    "roles": [],
                    "extra_demographics": None,
                },
            ],
        )

    def test_anonymous_user_list(self):
        response = self.client.get(reverse("kolibri:core:facilityuser-list"))
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.data,
            [],
        )

    def test_user_no_retrieve_admin(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:core:facilityuser-detail", kwargs={"pk": self.superuser.id}
            )
        )
        self.assertEqual(response.status_code, 404)

    def test_anonymous_no_retrieve_admin(self):
        response = self.client.get(
            reverse(
                "kolibri:core:facilityuser-detail", kwargs={"pk": self.superuser.id}
            )
        )
        self.assertEqual(response.status_code, 404)

    def test_anonymous_no_retrieve_user(self):
        response = self.client.get(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.id})
        )
        self.assertEqual(response.status_code, 404)


class FacilityUserOrderingTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.facility.add_admin(cls.superuser)

        base_time = datetime.now() - timedelta(days=3)
        cls.user1 = FacilityUserFactory.create(
            facility=cls.facility, username="mario", date_joined=base_time
        )
        cls.user2 = FacilityUserFactory.create(
            facility=cls.facility,
            username="luigi",
            date_joined=base_time + timedelta(days=1),
        )
        cls.user3 = FacilityUserFactory.create(
            facility=cls.facility,
            username="batman",
            date_joined=base_time + timedelta(days=4),
        )

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _sort_by_field(self, data, field, reverse=False):
        return sorted(data, key=lambda x: x[field], reverse=reverse)

    def test_default_ordering(self):
        response = self.client.get(reverse("kolibri:core:facilityuser-list"))
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data[0]["username"], "batman")
        sorted_data = self._sort_by_field(data, "username")
        self.assertEqual(data, sorted_data)

    def test_ordering_by_username(self):
        response = self.client.get(
            reverse("kolibri:core:facilityuser-list") + "?ordering=username"
        )
        self.assertEqual(response.status_code, 200)
        data = response.data
        sorted_data = self._sort_by_field(data, "username")
        self.assertEqual(data, sorted_data)

    def test_ordering_by_username_desc(self):
        response = self.client.get(
            reverse("kolibri:core:facilityuser-list") + "?ordering=-username"
        )
        self.assertEqual(response.status_code, 200)
        data = response.data
        self.assertEqual(data[0]["username"], "superuser")
        sorted_data = self._sort_by_field(data, "username", reverse=True)
        self.assertEqual(data, sorted_data)

    def test_ordering_by_date_joined(self):
        response = self.client.get(
            reverse("kolibri:core:facilityuser-list") + "?ordering=date_joined"
        )
        self.assertEqual(response.status_code, 200)
        data = response.data
        sorted_data = self._sort_by_field(data, "date_joined")
        self.assertEqual(data, sorted_data)

    def test_ordering_by_date_joined_desc(self):
        response = self.client.get(
            reverse("kolibri:core:facilityuser-list") + "?ordering=-date_joined"
        )
        self.assertEqual(response.status_code, 200)
        data = response.data
        sorted_data = self._sort_by_field(data, "date_joined", reverse=True)
        self.assertEqual(data, sorted_data)

    def test_ordering_by_full_name(self):
        response = self.client.get(
            reverse("kolibri:core:facilityuser-list") + "?ordering=full_name"
        )
        self.assertEqual(response.status_code, 200)
        data = response.data
        sorted_data = self._sort_by_field(data, "full_name")
        self.assertEqual(data, sorted_data)

    def test_ordering_by_full_name_desc(self):
        response = self.client.get(
            reverse("kolibri:core:facilityuser-list") + "?ordering=-full_name"
        )
        self.assertEqual(response.status_code, 200)
        data = response.data
        sorted_data = self._sort_by_field(data, "full_name", reverse=True)
        self.assertEqual(data, sorted_data)


class FacilityUserFilterTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        # Fixtures: 2 facilities with 1 learner + 1 admin each
        cls.facility_1 = FacilityFactory.create()
        cls.facility_2 = FacilityFactory.create()

        cls.user_1 = FacilityUserFactory.create(
            facility=cls.facility_1, username="learner_1"
        )
        cls.admin_1 = FacilityUserFactory.create(
            facility=cls.facility_1, username="admin_1"
        )
        cls.facility_1.add_admin(cls.admin_1)

        cls.user_2 = FacilityUserFactory.create(
            facility=cls.facility_2, username="learner_2"
        )
        cls.admin_2 = FacilityUserFactory.create(
            facility=cls.facility_2, username="admin_2"
        )
        cls.facility_2.add_admin(cls.admin_2)

        # Superuser is in facility 1
        cls.superuser = create_superuser(cls.facility_1, username="a_superuser")

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility_1,
        )

    def _sort_by_username(self, data):
        return sorted(data, key=lambda x: x["username"])

    def test_user_member_of_filter(self):
        response = self.client.get(
            reverse("kolibri:core:facilityuser-list"), {"member_of": self.facility_1.id}
        )
        data = self._sort_by_username(response.data)
        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]["id"], self.superuser.id)
        self.assertEqual(data[1]["id"], self.admin_1.id)
        self.assertEqual(data[2]["id"], self.user_1.id)


class LoginLogoutTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)
        cls.admin = FacilityUserFactory.create(facility=cls.facility, password="bar")
        cls.facility.add_admin(cls.admin)
        cls.cr = ClassroomFactory.create(parent=cls.facility)
        cls.cr.add_coach(cls.admin)
        cls.session_store = import_module(settings.SESSION_ENGINE).SessionStore()
        cls.user1 = FacilityUserFactory.create(
            username="Shared_Username", facility=cls.facility
        )
        cls.user2 = FacilityUserFactory.create(
            username="shared_username", facility=cls.facility
        )

    def test_login_and_logout_superuser(self):
        self.client.post(
            reverse("kolibri:core:session-list"),
            data={"username": self.superuser.username, "password": DUMMY_PASSWORD},
            format="json",
        )
        session_key = self.client.session.session_key
        self.assertTrue(self.session_store.exists(session_key))
        self.client.delete(
            reverse("kolibri:core:session-detail", kwargs={"pk": "current"})
        )
        self.assertFalse(self.session_store.exists(session_key))

    def test_login_and_logout_facility_user(self):
        self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.user.username,
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )
        session_key = self.client.session.session_key
        self.assertTrue(self.session_store.exists(session_key))
        self.client.delete(
            reverse("kolibri:core:session-detail", kwargs={"pk": "current"})
        )
        self.assertFalse(self.session_store.exists(session_key))

    def test_incorrect_credentials_does_not_log_in_user(self):
        session_key = self.client.session.session_key
        self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.user.username,
                "password": "foo",
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(session_key, self.client.session.session_key)

    def test_session_return_admin_and_coach_kind(self):
        self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.admin.username,
                "password": "bar",
                "facility": self.facility.id,
            },
            format="json",
        )
        response = self.client.put(
            reverse("kolibri:core:session-detail", kwargs={"pk": "current"})
        )
        self.assertIn(role_kinds.ADMIN, response.data["kind"])
        self.assertIn(role_kinds.COACH, response.data["kind"])

    def test_session_return_anon_kind(self):
        response = self.client.put(
            reverse("kolibri:core:session-detail", kwargs={"pk": "current"})
        )
        self.assertTrue(response.data["kind"][0], "anonymous")

    def test_session_update_last_active(self):
        self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.user.username,
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )
        expire_date = self.client.session.get_expiry_date()
        time.sleep(0.01)
        self.client.get(
            reverse("kolibri:core:session-detail", kwargs={"pk": "current"})
        )
        new_expire_date = self.client.session.get_expiry_date()
        self.assertLess(expire_date, new_expire_date)

    def test_case_insensitive_matching_usernames(self):
        response_user1 = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": "shared_username",
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )

        # Assert the expected behavior based on the application's design
        self.assertEqual(response_user1.status_code, 200)

        response_user2 = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": "Shared_Username",
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )

        # Assert the expected behavior for the second user
        self.assertEqual(response_user2.status_code, 200)

    def test_case_sensitive_matching_usernames(self):
        FacilityUserFactory.create(username="shared_username", facility=self.facility)

        response_user2 = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": "shared_username",
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )

        # Assert the expected behavior for the second user
        self.assertEqual(response_user2.status_code, 200)

        # Test no error when authentication fails
        response_user3 = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": "shared_username",
                "password": "wrong_password",
                "facility": self.facility.id,
            },
            format="json",
        )

        self.assertEqual(response_user3.status_code, 401)

    def test_not_specified_password(self):
        self.user.password = demographics.NOT_SPECIFIED
        self.user.save()

        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.user.username,
                "facility": self.facility.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data[0]["id"], error_constants.PASSWORD_NOT_SPECIFIED)

    def test_not_specified_password_os_user(self):
        self.user.password = demographics.NOT_SPECIFIED
        self.user.save()

        OSUser.objects.create(user=self.user, os_username="os_user")

        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.user.username,
                "facility": self.facility.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data[0]["id"], error_constants.MISSING_PASSWORD)


class SignUpBase(object):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        provision_device()

    def test_anon_sign_up_creates_user(self):
        response = self.post_to_sign_up(
            {"username": "user", "password": DUMMY_PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.FacilityUser.objects.all())

    def test_anon_sign_up_returns_user(self):
        full_name = "Bob Lee"
        response = self.post_to_sign_up(
            {"full_name": full_name, "username": "user", "password": DUMMY_PASSWORD}
        )
        self.assertEqual(response.data["username"], "user")
        self.assertEqual(response.data["full_name"], full_name)

    def test_create_user_with_same_username_case_insensitive_fails(self):
        FacilityUserFactory.create(username="bob", facility=self.facility)
        response = self.post_to_sign_up({"username": "BOB", "password": DUMMY_PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(models.FacilityUser.objects.all()), 1)

    def test_create_user_with_same_username_other_facility(self):
        user = FacilityUserFactory.create(username="bob")
        other_facility = models.Facility.objects.exclude(id=user.facility.id)[0]
        response = self.post_to_sign_up(
            {
                "username": "bob",
                "password": DUMMY_PASSWORD,
                "facility": other_facility.id,
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            models.FacilityUser.objects.filter(facility=self.facility.id).count(), 1
        )
        self.assertEqual(
            models.FacilityUser.objects.filter(facility=other_facility.id).count(), 1
        )

    def test_create_user_for_specific_facility(self):
        other_facility = FacilityFactory.create()
        response = self.post_to_sign_up(
            {
                "username": "bob",
                "password": DUMMY_PASSWORD,
                "facility": other_facility.id,
            }
        )
        user_id = response.data["id"]
        self.assertEqual(
            models.FacilityUser.objects.get(id=user_id).facility.id, other_facility.id
        )
        self.assertTrue(other_facility.get_members().filter(id=user_id).exists())

    def test_create_user_for_nonexistent_facility(self):
        response = self.post_to_sign_up(
            {
                "username": "bob",
                "password": DUMMY_PASSWORD,
                "facility": uuid.uuid4().hex,
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(models.FacilityUser.objects.all())

    def test_create_bad_username_fails(self):
        response = self.post_to_sign_up(
            {"username": "(***)", "password": DUMMY_PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(models.FacilityUser.objects.all())

    def test_sign_up_able_no_guest_access(self):
        set_device_settings(allow_guest_access=False)
        response = self.post_to_sign_up(
            {"username": "user", "password": DUMMY_PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.FacilityUser.objects.all())

    def test_no_sign_up_no_signups(self):
        self.facility.dataset.learner_can_sign_up = False
        self.facility.dataset.save()
        response = self.post_to_sign_up(
            {"username": "user", "password": DUMMY_PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(models.FacilityUser.objects.all())
        self.facility.dataset.learner_can_sign_up = True
        self.facility.dataset.save()

    def test_password_not_specified_password_required(self):
        self.facility.dataset.learner_can_login_with_no_password = False
        self.facility.dataset.save()
        response = self.post_to_sign_up(
            {"username": "user", "password": demographics.NOT_SPECIFIED}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(models.FacilityUser.objects.all())

    def test_password_not_specified_password_not_required(self):
        self.facility.dataset.learner_can_login_with_no_password = True
        self.facility.dataset.learner_can_edit_password = False
        self.facility.dataset.save()
        response = self.post_to_sign_up(
            {"username": "user", "password": demographics.NOT_SPECIFIED}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.FacilityUser.objects.all())


class AnonSignUpTestCase(SignUpBase, APITestCase):
    def post_to_sign_up(self, data):
        return self.client.post(
            reverse("kolibri:core:signup-list"), data=data, format="json"
        )

    def test_sign_up_also_logs_in_user(self):
        session_key = self.client.session.session_key
        self.post_to_sign_up({"username": "user", "password": DUMMY_PASSWORD})
        self.assertNotEqual(session_key, self.client.session.session_key)


class PublicSignUpTestCase(SignUpBase, APITestCase):
    def post_to_sign_up(self, data):
        return self.client.post(
            reverse("kolibri:core:publicsignup-list"), data=data, format="json"
        )


class FacilityDatasetAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.facility2 = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)

    def update_pin(self, payload):
        return self.client.post(
            reverse(
                "kolibri:core:facilitydataset-update-pin",
                kwargs={"pk": self.facility.dataset_id},
            ),
            payload,
        )

    def test_return_all_datasets_for_an_admin(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:facilitydataset-list"))
        self.assertEqual(len(response.data), len(models.FacilityDataset.objects.all()))

    def test_filter_facility_id_for_an_admin(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:facilitydataset-list"),
            {"facility_id": self.facility.id},
        )
        self.assertEqual(
            len(response.data),
            len(models.FacilityDataset.objects.filter(collection=self.facility.id)),
        )

    def test_admin_can_edit_dataset_for_which_they_are_admin(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {"description": "This is not a drill"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    def test_admin_cant_edit_dataset_for_which_they_are_not_admin(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.delete(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility2.dataset_id},
            ),
            {"description": "This is not a drill"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_return_all_datasets_for_superuser(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:facilitydataset-list"))
        self.assertEqual(len(response.data), len(models.FacilityDataset.objects.all()))

    def test_return_all_datasets_for_facility_user(self):
        self.client.login(username=self.user.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:facilitydataset-list"))
        self.assertEqual(len(response.data), len(models.FacilityDataset.objects.all()))

    def test_facility_user_cannot_delete_dataset(self):
        self.client.login(username=self.user.username, password=DUMMY_PASSWORD)
        response = self.client.delete(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_facility_admin_can_reset_settings(self):
        facility = FacilityFactory.create()
        admin = FacilityUserFactory.create(facility=facility)
        facility.add_admin(admin)

        self.client.login(username=admin.username, password=DUMMY_PASSWORD)

        def set_all_false_and_preset(facility, preset):
            all_false = {
                "learner_can_edit_username": False,
                "learner_can_edit_name": False,
                "learner_can_edit_password": False,
                "learner_can_sign_up": False,
                "learner_can_delete_account": False,
                "learner_can_login_with_no_password": False,
                "show_download_button_in_learn": False,
            }
            for key, value in all_false.items():
                setattr(facility.dataset, key, value)
            facility.dataset.preset = preset
            facility.dataset.save()

        def post_resetsettings():
            return self.client.post(
                reverse(
                    "kolibri:core:facilitydataset-resetsettings",
                    kwargs={"pk": facility.dataset_id},
                ),
            )

        # test all three presets
        for setting in ["formal", "nonformal", "informal"]:
            set_all_false_and_preset(facility, setting)
            response = post_resetsettings()
            self.assertEqual(response.data, dict(response.data, **mappings[setting]))

    def test_for_incompatible_settings_together(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {
                "learner_can_login_with_no_password": "true",
                "learner_can_edit_password": "true",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_for_incompatible_settings_sequentially(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {
                "learner_can_edit_password": "true",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {
                "learner_can_login_with_no_password": "true",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_for_incompatible_settings_only_one(self):
        # Test case handles the case when only `learner_can_login_with_no_password`
        # is set to true in the patch request while `learner_can_edit_password`
        # already being true due to it's default value
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {
                "learner_can_login_with_no_password": "true",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_facility_admin_can_set_pin(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({"pin_code": "1234"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["extra_fields"]["pin_code"], "1234")

    def test_facility_admin_can_set_pin_starting_with_zero(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({"pin_code": "0000"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["extra_fields"]["pin_code"], "0000")

    def test_facility_admin_can_set_pin_short_pin(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({"pin_code": "123"})
        self.assertEqual(response.status_code, 400)

    def test_facility_admin_can_set_pin_empty_payload(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({})
        self.assertEqual(response.status_code, 400)

    def test_facility_admin_can_set_pin_invalid_input(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({"pin_code": "abcd"})
        self.assertEqual(response.status_code, 400)

    def test_facility_admin_can_set_pin_pin_as_none(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({})
        self.assertEqual(response.status_code, 400)

    def test_facility_admin_can_unset_pin(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({"pin_code": "5555"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["extra_fields"]["pin_code"], "5555")

        # Unset pin from settings
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-update-pin",
                kwargs={"pk": self.facility.dataset_id},
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["extra_fields"]["pin_code"], None)


class IsPINValidAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)

    def update_pin(self, payload):
        return self.client.post(
            reverse(
                "kolibri:core:facilitydataset-update-pin",
                kwargs={"pk": self.facility.dataset_id},
            ),
            payload,
        )

    def is_pin_valid(self, payload):
        return self.client.post(
            reverse(
                "kolibri:core:ispinvalid",
                kwargs={"pk": self.facility.dataset_id},
            ),
            payload,
        )

    def test_facility_admin_can_check_is_pin_valid_correct_pin(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({"pin_code": "1234"})
        self.assertEqual(response.status_code, 200)
        response = self.is_pin_valid({"pin_code": "1234"})
        self.assertEqual(response.data["is_pin_valid"], True)

    def test_facility_admin_can_check_is_pin_valid_incorrect_pin(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({"pin_code": "1234"})
        self.assertEqual(response.status_code, 200)
        response = self.is_pin_valid({"pin_code": "1243"})
        self.assertEqual(response.data["is_pin_valid"], False)

    def test_facility_admin_can_check_is_pin_valid_unset_pin(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.update_pin({"pin_code": "1234"})
        self.assertEqual(response.status_code, 200)

        # unset pin
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-update-pin",
                kwargs={"pk": self.facility.dataset_id},
            ),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["extra_fields"]["pin_code"], None)

        response = self.is_pin_valid({"pin_code": "1234"})
        self.assertEqual(response.data["is_pin_valid"], False)

    def test_facility_admin_can_check_is_pin_valid_empty_pin_specified(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        self.update_pin({"pin_code": "1234"})
        response = self.is_pin_valid({"pin_code": ""})
        self.assertEqual(response.status_code, 400)

    def test_facility_admin_can_check_is_pin_valid_empty_payload(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        self.update_pin({"pin_code": "1234"})
        response = self.is_pin_valid({})
        self.assertEqual(response.status_code, 400)

    def test_facility_admin_can_check_is_pin_valid_pin_as_none(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        self.update_pin({"pin_code": "1234"})
        response = self.is_pin_valid({})
        self.assertEqual(response.status_code, 400)


class MembershipAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)
        cls.other_user = FacilityUserFactory.create(facility=cls.facility)
        cls.classroom = ClassroomFactory.create(parent=cls.facility)
        cls.lg = LearnerGroupFactory.create(parent=cls.classroom)
        cls.classroom_membership = models.Membership.objects.create(
            collection=cls.classroom, user=cls.user
        )
        models.Membership.objects.create(collection=cls.lg, user=cls.user)
        # create other user memberships
        models.Membership.objects.create(collection=cls.classroom, user=cls.other_user)
        models.Membership.objects.create(collection=cls.lg, user=cls.other_user)

    def login_superuser(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_user_list_own(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:membership-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        for membership in response.data:
            self.assertEqual(membership["user"], self.user.id)

    def test_other_user_list_own(self):
        self.client.login(
            username=self.other_user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:membership-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        for membership in response.data:
            self.assertEqual(membership["user"], self.other_user.id)

    def test_superuser_list_all(self):
        self.login_superuser()
        response = self.client.get(reverse("kolibri:core:membership-list"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 4)

    def test_user_retrieve_own(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:core:membership-detail",
                kwargs={"pk": self.classroom_membership.id},
            )
        )
        self.assertEqual(response.status_code, 200)

    def test_user_retrieve_other(self):
        self.client.login(
            username=self.other_user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(
            reverse(
                "kolibri:core:membership-detail",
                kwargs={"pk": self.classroom_membership.id},
            )
        )
        self.assertEqual(response.status_code, 404)

    def test_superuser_retrieve_other(self):
        self.login_superuser()
        response = self.client.get(
            reverse(
                "kolibri:core:membership-detail",
                kwargs={"pk": self.classroom_membership.id},
            )
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_classroom_membership(self):
        self.login_superuser()
        url = reverse("kolibri:core:membership-list") + "?user={}&collection={}".format(
            self.user.id, self.classroom.id
        )
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.Membership.objects.filter(user=self.user).exists())

    def test_delete_detail(self):
        self.login_superuser()
        response = self.client.delete(
            reverse(
                "kolibri:core:membership-detail",
                kwargs={"pk": self.classroom_membership.id},
            )
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.Membership.objects.filter(user=self.user).exists())

    def test_delete_does_not_affect_other_user_memberships(self):
        self.login_superuser()
        expected_count = models.Membership.objects.filter(user=self.other_user).count()
        self.client.delete(
            reverse(
                "kolibri:core:membership-detail",
                kwargs={"pk": self.classroom_membership.id},
            )
        )
        self.assertEqual(
            models.Membership.objects.filter(user=self.other_user).count(),
            expected_count,
        )


class GroupMembership(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)
        cls.classroom1 = ClassroomFactory.create(parent=cls.facility)
        cls.classroom2 = ClassroomFactory.create(parent=cls.facility)
        cls.lg11 = LearnerGroupFactory.create(parent=cls.classroom1)
        cls.lg12 = LearnerGroupFactory.create(parent=cls.classroom1)
        cls.lg21 = LearnerGroupFactory.create(parent=cls.classroom2)
        cls.classroom1_membership = models.Membership.objects.create(
            collection=cls.classroom1, user=cls.user
        )
        cls.classroom2_membership = models.Membership.objects.create(
            collection=cls.classroom2, user=cls.user
        )

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_create_group_membership_no_group_membership(self):
        url = reverse("kolibri:core:membership-list")
        response = self.client.post(
            url, {"user": self.user.id, "collection": self.lg11.id}, format="json"
        )
        self.assertEqual(response.status_code, 201)

    def test_create_group_membership_group_membership_other_class(self):
        models.Membership.objects.create(user=self.user, collection=self.lg21)
        url = reverse("kolibri:core:membership-list")
        response = self.client.post(
            url, {"user": self.user.id, "collection": self.lg11.id}, format="json"
        )
        self.assertEqual(response.status_code, 201)

    def test_create_group_membership_group_membership_same_class(self):
        models.Membership.objects.create(user=self.user, collection=self.lg12)
        url = reverse("kolibri:core:membership-list")
        response = self.client.post(
            url, {"user": self.user.id, "collection": self.lg11.id}, format="json"
        )
        self.assertEqual(response.status_code, 201)

    def test_create_class_membership_group_membership_different_class(self):
        self.classroom2_membership.delete()
        url = reverse("kolibri:core:membership-list")
        response = self.client.post(
            url, {"user": self.user.id, "collection": self.classroom2.id}, format="json"
        )
        self.assertEqual(response.status_code, 201)

    def test_create_group_membership_no_class_membership(self):
        self.classroom1_membership.delete()
        url = reverse("kolibri:core:membership-list")
        response = self.client.post(
            url, {"user": self.user.id, "collection": self.lg11.id}, format="json"
        )
        self.assertEqual(response.status_code, 400)


class DuplicateUsernameTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        cls.user = FacilityUserFactory.create(facility=cls.facility, username="user")
        cls.url = reverse("kolibri:core:usernameavailable")
        provision_device()

    def test_check_duplicate_username_with_unique_username(self):
        response = self.client.post(
            self.url,
            data={"username": "new_user", "facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.data, True)

    def test_check_duplicate_username_with_existing_username(self):
        response = self.client.post(
            self.url,
            data={"username": self.user.username, "facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.data[0]["id"], error_constants.USERNAME_ALREADY_EXISTS
        )

    def test_check_duplicate_username_with_existing_username_other_facility(self):
        other_facility = FacilityFactory.create()
        response = self.client.post(
            self.url,
            data={"username": self.user.username, "facility": other_facility.id},
            format="json",
        )
        self.assertEqual(response.data, True)


class CSRFProtectedAuthTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        # Naming client as client_csrf as self.client is already used in the parent class
        cls.client_csrf = APIClient(enforce_csrf_checks=True)
        cls.facility = FacilityFactory.create()
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def test_not_csrf_protected_session_list(self):
        response = self.client_csrf.post(
            reverse("kolibri:core:session-list"),
            data={"username": self.user.username, "password": DUMMY_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_csrf_protected_signup_list(self):
        response = self.client_csrf.post(
            reverse("kolibri:core:signup-list"),
            data={"username": "user", "password": DUMMY_PASSWORD},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class SetNonSpecifiedPasswordViewTestCase(APITestCase):
    def setUp(self):
        self.url = reverse("kolibri:core:setnonspecifiedpassword")
        self.facility = FacilityFactory.create()
        self.user = models.FacilityUser.objects.create(
            username="testuser",
            facility=self.facility,
            password=demographics.NOT_SPECIFIED,
        )

    def test_set_non_specified_password(self):
        # Make a POST request to set the password
        data = {
            "username": "testuser",
            "password": "newpassword",
            "facility": self.facility.id,
        }
        response = self.client.post(self.url, data)

        # Check that the response has a 200 OK status code
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Refresh the user object from the database
        self.user.refresh_from_db()

        # Check that the password has been updated
        self.assertTrue(self.user.check_password("newpassword"))

    def test_set_non_specified_password_invalid_facility(self):
        # Make a POST request to set the password
        data = {
            "username": "testuser",
            "password": "newpassword",
            "facility": uuid.uuid4().hex,
        }
        response = self.client.post(self.url, data)

        # Check that the response has a 404 Not Found status code
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_set_non_specified_password_missing_facility(self):
        # Make a POST request to set the password
        data = {
            "username": "testuser",
            "password": "newpassword",
        }
        response = self.client.post(self.url, data)

        # Check that the response has a 400 Bad Request status code
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_non_specified_password_invalid_username(self):
        # Make a POST request to set the password
        data = {
            "username": "invalidusername",
            "password": "newpassword",
            "facility": self.facility.id,
        }
        response = self.client.post(self.url, data)

        # Check that the response has a 404 Not Found status code
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_set_non_specified_password_missing_username(self):
        # Make a POST request to set the password
        data = {
            "password": "newpassword",
            "facility": self.facility.id,
        }
        response = self.client.post(self.url, data)

        # Check that the response has a 400 Bad Request status code
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_non_specified_password_missing_password(self):
        # Make a POST request to set the password
        data = {
            "username": "testuser",
            "facility": self.facility.id,
        }
        response = self.client.post(self.url, data)

        # Check that the response has a 400 Bad Request status code
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_set_non_specified_password_password_is_specified(self):
        self.user.set_password("password")
        self.user.save()

        # Make a POST request to set the password
        data = {
            "username": "testuser",
            "password": "newpassword",
            "facility": self.facility.id,
        }
        response = self.client.post(self.url, data)

        # Check that the response has a 404 Not Found status code
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_set_non_specified_password_user_is_os_user(self):
        OSUser.objects.create(user=self.user, os_username="osuser")

        # Make a POST request to set the password
        data = {
            "username": "testuser",
            "password": "newpassword",
            "facility": self.facility.id,
        }
        response = self.client.post(self.url, data)

        # Check that the response has a 400 Bad Request status code
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
