import base64
import collections
import time
import uuid
from datetime import datetime
from datetime import timedelta
from importlib import import_module

from django.conf import settings
from django.db import connection
from django.db.models.signals import pre_delete
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from mock import Mock
from mock import patch
from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.models import Certificate
from morango.models import DatabaseMaxCounter
from morango.models import DeletedModels
from morango.models import HardDeletedModels
from morango.models import Store
from morango.models import SyncSession
from morango.models import TransferSession
from morango.sync.controller import MorangoProfileController
from rest_framework import status
from rest_framework.test import APIClient

from kolibri.core import error_constants
from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.constants import demographics
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.errors import NoAvailableSequences
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.signals import cascade_delete_user
from kolibri.core.auth.tasks import assign_picture_passwords_to_facility
from kolibri.core.device.models import OSUser
from kolibri.core.device.utils import set_device_settings
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseTimeout
from kolibri.core.tasks.job import Job
from kolibri.core.test.model_factory import ModelFactory
from kolibri.core.test.model_factory import sequence

from .. import models
from ..constants import role_kinds
from ..constants.facility_presets import mappings
from ..models import Facility
from ..viewsets.membership import _prepare_for_bulk_create
from .helpers import create_superuser
from .helpers import disable_picture_password
from .helpers import DUMMY_PASSWORD
from .helpers import enable_picture_password
from .helpers import KolibriAPITestCase as APITestCase
from .helpers import KolibriAPITransactionTestCase as APITransactionTestCase
from .helpers import provision_device
from .helpers import setup_device


class FacilityFactory(ModelFactory):
    model = models.Facility
    _name = sequence("Rock N' Roll High School #%d")

    @classmethod
    def field_defaults(cls):
        return {"name": cls._name}


class ClassroomFactory(ModelFactory):
    model = models.Classroom
    _name = sequence("Basic Rock Theory #%d")

    @classmethod
    def field_defaults(cls):
        return {"name": cls._name}


class LearnerGroupFactory(ModelFactory):
    model = models.LearnerGroup
    _name = sequence("Group #%d")

    @classmethod
    def field_defaults(cls):
        return {"name": cls._name}


class FacilityUserFactory(ModelFactory):
    model = models.FacilityUser
    _username = sequence("user%d")

    @classmethod
    def field_defaults(cls):
        return {
            "facility": FacilityFactory.create,
            "username": cls._username,
        }

    @classmethod
    def create(cls, **kwargs):
        password = kwargs.pop("password", DUMMY_PASSWORD)
        user = super().create(**kwargs)
        user.set_password(password)
        user.save()
        return user


class LearnerGroupAPITestCase(APITestCase):
    databases = "__all__"

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
    databases = "__all__"

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

    def test_soft_deleted_coach_excluded_from_classroom(self):
        self.login_superuser()
        coach = FacilityUserFactory.create(facility=self.facility)
        self.classrooms[0].add_coach(coach)
        # Soft-delete the coach
        coach.delete()
        response = self.client.get(
            reverse(
                "kolibri:core:classroom-detail",
                kwargs={"pk": self.classrooms[0].id},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        coach_ids = [c["id"] for c in response.data["coaches"]]
        self.assertNotIn(coach.id, coach_ids)

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

    def test_public_facilityuser_roles_are_flat_strings(self):
        """Roles must be a flat list of kind strings, not nested objects.

        Consumers (RemoteFacilityUserAuthenticatedViewset, peer import
        validation, frontend JS) do ``role in roles`` checks against plain
        strings like "admin", so the shape must stay ["admin", ...].
        """
        # Give user1 an admin role on the facility
        models.Role.objects.create(
            user=self.user1, collection=self.facility1, kind="admin"
        )
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
        user1_data = next(u for u in response.data if u["id"] == self.user1.id)
        self.assertEqual(user1_data["roles"], ["admin"])
        # Regular user with no roles gets an empty list
        user2_data = next(
            (u for u in response.data if u["roles"] == []),
            None,
        )
        self.assertIsNotNone(user2_data)

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

    @patch(
        "kolibri.core.auth.utils.picture_passwords.LEARNER_PICTURE_PASSWORD_LIMIT", 2
    )
    def test_picture_passwords_exhausted_false_when_learner_count_below_limit(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse(
                "kolibri:core:facility-detail",
                kwargs={"pk": self.facility1.id},
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["picture_passwords_exhausted"])

    @patch(
        "kolibri.core.auth.utils.picture_passwords.LEARNER_PICTURE_PASSWORD_LIMIT", 2
    )
    def test_picture_passwords_exhausted_true_when_learner_count_reaches_limit(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        FacilityUserFactory.create(facility=self.facility1)
        response = self.client.get(
            reverse(
                "kolibri:core:facility-detail",
                kwargs={"pk": self.facility1.id},
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["picture_passwords_exhausted"])

    @patch(
        "kolibri.core.auth.utils.picture_passwords.LEARNER_PICTURE_PASSWORD_LIMIT", 2
    )
    def test_picture_passwords_exhausted_ignores_non_learner_users(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        coach = FacilityUserFactory.create(facility=self.facility1)
        self.facility1.add_coach(coach)
        admin = FacilityUserFactory.create(facility=self.facility1)
        self.facility1.add_admin(admin)

        response = self.client.get(
            reverse(
                "kolibri:core:facility-detail",
                kwargs={"pk": self.facility1.id},
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["picture_passwords_exhausted"])

    def test_learner_count_in_facility_response(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse(
                "kolibri:core:facility-detail",
                kwargs={"pk": self.facility1.id},
            )
        )
        self.assertEqual(response.status_code, 200)
        # facility1 has user1 (a learner) plus the superuser (not a learner)
        self.assertEqual(response.data["num_learners"], 1)

    def test_facility_response_has_dataset_nested_object(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data["dataset"], dict)

    def test_dataset_has_exactly_expected_fields(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(response.data["dataset"].keys()),
            {
                "id",
                "learner_can_edit_username",
                "learner_can_edit_name",
                "learner_can_edit_password",
                "learner_can_sign_up",
                "learner_can_delete_account",
                "learner_can_login_with_no_password",
                "show_download_button_in_learn",
                "enable_mark_attendance",
                "extra_fields",
                "picture_password_settings",
                "description",
                "location",
                "registered",
                "preset",
                "allow_guest_access",
                "is_full_facility_import",
            },
        )

    def test_facility_response_has_num_classrooms(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["num_classrooms"], 0)

    def test_facility_response_has_num_users(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility1,
        )
        response = self.client.get(
            reverse("kolibri:core:facility-detail", kwargs={"pk": self.facility1.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["num_users"], 1)


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
    databases = "__all__"

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
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
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
            username=self.user.username,
            password=new_password,
            facility=self.facility,
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
            username=self.user.username,
            password=new_password,
            facility=self.facility,
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


@patch("kolibri.core.auth.viewsets.facility_user.cleanup_expired_deleted_users")
class UserDeleteTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def tearDown(self):
        self.user.delete()

    def test_user_delete(self, mock_cleanup_task):
        response = self.client.delete(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": self.user.pk}),
            format="json",
        )
        self.assertEqual(response.status_code, 204)
        self.assertTrue(
            models.FacilityUser.all_objects.filter(
                id=self.user.id, date_deleted__isnull=False
            ).exists()
        )
        self.assertFalse(models.FacilityUser.objects.filter(id=self.user.id).exists())
        mock_cleanup_task.enqueue.assert_called_once()

    def test_superuser_delete_self(self, mock_cleanup_task):
        response = self.client.delete(
            reverse(
                "kolibri:core:facilityuser-detail", kwargs={"pk": self.superuser.pk}
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_bulk_delete_users(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]

        response = self.client.delete(
            reverse("kolibri:core:facilityuser-list") + "?by_ids=" + ",".join(user_ids)
        )

        self.assertEqual(response.status_code, 204)
        for user in users:
            self.assertTrue(
                models.FacilityUser.all_objects.filter(
                    id=user.id, date_deleted__isnull=False
                ).exists()
            )
            self.assertFalse(models.FacilityUser.objects.filter(id=user.id).exists())

    def test_bulk_delete_excludes_superuser(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(2)]
        user_ids = [str(user.id) for user in users] + [str(self.superuser.id)]

        response = self.client.delete(
            reverse("kolibri:core:facilityuser-list") + "?by_ids=" + ",".join(user_ids)
        )
        self.assertEqual(response.status_code, 403)

        self.assertTrue(
            models.FacilityUser.objects.filter(id=self.superuser.id).exists()
        )

    def test_get_soft_deleted_users(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]
        self.client.delete(
            reverse("kolibri:core:facilityuser-list") + f"?by_ids={','.join(user_ids)}"
        )

        # Get soft-deleted users
        response = self.client.get(reverse("kolibri:core:deletedfacilityuser-list"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(users))
        for user in users:
            self.assertTrue(
                any(
                    deleted_user["id"] == str(user.id) for deleted_user in response.data
                )
            )
        self.assertTrue(
            all(
                deleted_user["date_deleted"] is not None
                for deleted_user in response.data
            )
        )

    def test_date_deleted_ordering(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]
        for idx, user in enumerate(users):
            with patch(
                "django.utils.timezone.now",
                return_value=timezone.now() - timedelta(days=idx + 1),
            ):
                self.client.delete(
                    reverse("kolibri:core:facilityuser-detail", kwargs={"pk": user.pk})
                )
            models.FacilityUser.objects.filter(id=user.id).update(
                date_deleted=timezone.now() - timedelta(days=idx + 1)
            )

        # Get soft-deleted users ordered by date_deleted
        response = self.client.get(
            reverse("kolibri:core:deletedfacilityuser-list") + "?ordering=date_deleted"
        )

        expected_users = (
            models.FacilityUser.soft_deleted_objects.filter(id__in=user_ids)
            .order_by("date_deleted")
            .values_list("id", flat=True)
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), len(expected_users))

        for idx, deleted_user in enumerate(response.data):
            self.assertEqual(deleted_user["id"], str(expected_users[idx]))

    def test_bulk_hard_delete_without_filters(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]
        # Soft delete users
        self.client.delete(
            reverse("kolibri:core:facilityuser-list") + f"?by_ids={','.join(user_ids)}"
        )

        # Hard delete users without any filters
        response = self.client.delete(reverse("kolibri:core:deletedfacilityuser-list"))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            models.FacilityUser.all_objects.filter(id__in=user_ids).count(), len(users)
        )

    def test_bulk_hard_delete_non_soft_deleted_users(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]

        # Hard delete users without being soft deleted
        response = self.client.delete(
            reverse("kolibri:core:deletedfacilityuser-list")
            + f"?by_ids={','.join(user_ids)}"
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(
            models.FacilityUser.all_objects.filter(id__in=user_ids).count(), len(users)
        )

    def test_bulk_hard_delete_users(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]
        # Soft delete users
        self.client.delete(
            reverse("kolibri:core:facilityuser-list") + f"?by_ids={','.join(user_ids)}"
        )

        # Hard delete users
        response = self.client.delete(
            reverse("kolibri:core:deletedfacilityuser-list")
            + f"?by_ids={','.join(user_ids)}"
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            models.FacilityUser.all_objects.filter(id__in=user_ids).exists()
        )

    def test_restore_soft_deleted_users_without_filters(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]
        # Soft delete users
        self.client.delete(
            reverse("kolibri:core:facilityuser-list") + f"?by_ids={','.join(user_ids)}"
        )

        # Restore soft deleted users without filters
        response = self.client.post(reverse("kolibri:core:deletedfacilityuser-restore"))

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            models.FacilityUser.soft_deleted_objects.filter(id__in=user_ids).count(),
            len(users),
        )

    def test_restore_non_soft_deleted_users(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]

        # Restore non-soft deleted users
        response = self.client.post(
            reverse("kolibri:core:deletedfacilityuser-restore")
            + f"?by_ids={','.join(user_ids)}"
        )

        self.assertEqual(response.status_code, 404)

    def test_restore_soft_deleted_users(self, mock_cleanup_task):
        users = [FacilityUserFactory.create(facility=self.facility) for _ in range(3)]
        user_ids = [str(user.id) for user in users]
        # Soft delete users
        self.client.delete(
            reverse("kolibri:core:facilityuser-list") + f"?by_ids={','.join(user_ids)}"
        )

        # Restore soft deleted users
        response = self.client.post(
            reverse("kolibri:core:deletedfacilityuser-restore")
            + f"?by_ids={','.join(user_ids)}"
        )

        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            models.FacilityUser.soft_deleted_objects.filter(id__in=user_ids).exists()
        )
        self.assertEqual(
            models.FacilityUser.objects.filter(id__in=user_ids).count(), len(users)
        )

    def test_not_able_to_create_soft_deleted_user(self, mock_cleanup_task):
        # Try to create a new user with the same username as a soft-deleted user
        new_user_data = {
            "username": "testuser",
            "password": "newpassword",
            "facility": self.facility.id,
        }
        response = self.client.post(
            reverse("kolibri:core:deletedfacilityuser-list"),
            new_user_data,
            format="json",
        )

        self.assertEqual(response.status_code, 405)

    def test_not_able_to_update_soft_deleted_user(self, mock_cleanup_task):
        # Create a user and then soft delete it
        user = FacilityUserFactory.create(facility=self.facility, username="testuser")
        self.client.delete(
            reverse("kolibri:core:facilityuser-detail", kwargs={"pk": user.pk})
        )

        # Try to update the soft-deleted user
        update_data = {"username": "updateduser"}
        response = self.client.patch(
            reverse("kolibri:core:deletedfacilityuser-detail", kwargs={"pk": user.pk}),
            update_data,
            format="json",
        )

        self.assertEqual(response.status_code, 405)


class UserRetrieveTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.facility.add_admin(cls.superuser)
        cls.user = FacilityUserFactory.create(facility=cls.facility)
        cls.facility_coach = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_role(cls.facility_coach, "coach")
        cls.class_coach = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_role(cls.class_coach, "classroom assignable coach")
        cls.user_response = cls._generate_user_response_dict(cls.user)
        cls.facility_coach_response = cls._generate_user_response_dict(
            cls.facility_coach
        )
        cls.class_coach_response = cls._generate_user_response_dict(cls.class_coach)
        cls.superuser_response = cls._generate_user_response_dict(cls.superuser)

    @classmethod
    def _generate_user_response_dict(cls, user):
        response_dict = {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "facility": user.facility_id,
            "id_number": user.id_number,
            "gender": user.gender,
            "date_joined": user.date_joined,
            "birth_year": user.birth_year,
            "is_superuser": user.is_superuser,
            "extra_demographics": None,
            "picture_password": user.picture_password,
        }
        roles = []
        user_roles = user.roles.all()
        if user_roles.exists():
            for role in user_roles:
                roles.append(
                    {
                        "collection": role.collection_id,
                        "kind": role.kind,
                        "id": role.id,
                    }
                )

        response_dict["roles"] = roles
        return response_dict

    def _make_request(self, user=None, url=None, params=None):
        if user:
            self.client.login(
                username=user.username,
                password=DUMMY_PASSWORD,
                facility=self.facility,
            )

        if url is None:
            url = reverse("kolibri:core:facilityuser-list")

        return self.client.get(url, params, format="json")

    def test_user_list(self):
        response = self._make_request(self.superuser)
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.data,
            [
                self.user_response,
                self.facility_coach_response,
                self.class_coach_response,
                self.superuser_response,
            ],
        )

    def test_user_list_self(self):
        response = self._make_request(self.user)
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.data,
            [self.user_response],
        )

    def test_user_list_filter_user_type_coach(self):
        response = self._make_request(
            user=self.superuser, url=None, params={"user_type": "coach"}
        )
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.data,
            [self.facility_coach_response, self.class_coach_response],
        )

    def test_anonymous_user_list(self):
        response = self._make_request()
        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(
            response.data,
            [],
        )

    def test_user_no_retrieve_admin(self):
        response = self._make_request(
            user=self.user,
            url=reverse(
                "kolibri:core:facilityuser-detail", kwargs={"pk": self.superuser.id}
            ),
        )
        self.assertEqual(response.status_code, 404)

    def test_anonymous_no_retrieve_admin(self):
        response = self._make_request(
            user=None,
            url=reverse(
                "kolibri:core:facilityuser-detail", kwargs={"pk": self.superuser.id}
            ),
        )
        self.assertEqual(response.status_code, 404)

    def test_anonymous_no_retrieve_user(self):
        response = self._make_request(
            user=None,
            url=reverse(
                "kolibri:core:facilityuser-detail", kwargs={"pk": self.user.id}
            ),
        )
        self.assertEqual(response.status_code, 404)


class FacilityUserOrderingTestCase(APITestCase):
    databases = "__all__"

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
    databases = "__all__"

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


class PicturePasswordLoginTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.other_facility = FacilityFactory.create()
        cls.learner = FacilityUserFactory.create(facility=cls.facility)
        cls.learner.picture_password = "1.2.3"
        cls.learner.save(update_fields=["picture_password"])

    def setUp(self):
        enable_picture_password(self.facility)
        enable_picture_password(self.other_facility)

    def test_valid_picture_password_creates_session(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "picture_password": "1.2.3",
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user_id"], self.learner.id)

    def test_picture_password_not_enabled(self):
        disable_picture_password(self.facility, passwordless=True)

        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "picture_password": "1.2.3",
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)

    def test_picture_password_wrong_facility_returns_not_found(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "picture_password": "1.2.3",
                "facility": self.other_facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)

    def test_picture_password_no_match_returns_not_found(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "picture_password": "9.9.9",
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)

    def test_coach_not_authenticated_via_picture_password(self):
        coach = FacilityUserFactory.create(facility=self.facility)
        coach.picture_password = "4.5.6"
        coach.save(update_fields=["picture_password"])
        self.facility.add_coach(coach)
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "picture_password": "4.5.6",
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)

    def test_admin_not_authenticated_via_picture_password(self):
        admin = FacilityUserFactory.create(facility=self.facility)
        admin.picture_password = "7.8.9"
        admin.save(update_fields=["picture_password"])
        self.facility.add_admin(admin)
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "picture_password": "7.8.9",
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIsInstance(response.data, list)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)

    def test_picture_password_none_falls_through_to_username_path(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.learner.username,
                "password": DUMMY_PASSWORD,
                "picture_password": None,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user_id"], self.learner.id)

    def test_picture_password_omitted_falls_through_to_username_path(self):
        # Omitting the field entirely should behave identically to sending null,
        # confirming the serializer default=None wiring.
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.learner.username,
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user_id"], self.learner.id)

    def test_picture_password_empty_string_rejected_by_serializer(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={"picture_password": "", "facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_picture_password_too_long_rejected_by_serializer(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={"picture_password": "1.2.3.4.5", "facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_picture_password_invalid_format_rejected_by_serializer(self):
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={"picture_password": "abc", "facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_picture_password_and_username_password_picture_password_takes_precedence(
        self,
    ):
        # When both picture_password and username/password are supplied,
        # the picture-password path is used; username/password is ignored.
        response = self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "picture_password": "1.2.3",
                "username": self.learner.username,
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user_id"], self.learner.id)


class SignUpBase:
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
    databases = "__all__"

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
    databases = "__all__"

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

    def test_response_includes_allow_guest_access_field(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        set_device_settings(allow_guest_access=False)
        response = self.client.get(reverse("kolibri:core:facilitydataset-list"))
        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.data), 0)
        self.assertFalse(response.data[0]["allow_guest_access"])

    def test_response_includes_is_full_facility_import_field(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse("kolibri:core:facilitydataset-list"),
            {"facility_id": self.facility.id},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        # Locally-provisioned facilities have a FULL_FACILITY root certificate
        self.assertIn("is_full_facility_import", response.data[0])

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

    def test_picture_password_incompatible_with_learner_can_edit_password(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {
                "picture_password_settings": {
                    "icon_style": "standard",
                    "show_icon_text": False,
                },
                "learner_can_edit_password": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_learner_can_edit_password_incompatible_with_existing_picture_password(
        self,
    ):
        # Reverse direction: picture password already enabled, then try to
        # enable learner_can_edit_password via a PATCH that only sends that field.
        self.facility.dataset.learner_can_edit_password = False
        self.facility.dataset.picture_password_settings = {
            "icon_style": "standard",
            "show_icon_text": False,
        }
        self.facility.dataset.save()
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {"learner_can_edit_password": True},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_picture_password_fields_returned_in_facility_settings_response(self):
        self.facility.dataset.learner_can_edit_password = False
        self.facility.dataset.picture_password_settings = {
            "icon_style": "colorful",
            "show_icon_text": True,
        }
        self.facility.dataset.save()
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            )
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["picture_password_settings"],
            {"icon_style": "colorful", "show_icon_text": True},
        )

    def test_picture_password_settings_rejects_invalid_icon_style(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {
                "picture_password_settings": {
                    "icon_style": "invalid",
                    "show_icon_text": False,
                },
                "learner_can_edit_password": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_picture_password_settings_rejects_non_boolean_show_icon_text(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            reverse(
                "kolibri:core:facilitydataset-detail",
                kwargs={"pk": self.facility.dataset_id},
            ),
            {
                "picture_password_settings": {
                    "icon_style": "standard",
                    "show_icon_text": "yes",
                },
                "learner_can_edit_password": False,
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


class SaveFacilityLoginSettingsAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.admin = FacilityUserFactory.create(facility=cls.facility)
        cls.non_admin = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_admin(cls.admin)
        cls.learner = FacilityUserFactory.create(facility=cls.facility)
        cls.coach = FacilityUserFactory.create(facility=cls.facility)
        cls.facility.add_coach(cls.coach)

    def _url(self):
        return reverse(
            "kolibri:core:facilitydataset-save-facility-login-settings",
            kwargs={"pk": self.facility.dataset_id},
        )

    def _picture_password_settings(self):
        return {"icon_style": "standard", "show_icon_text": True}

    def test_requires_authenticated_user(self):
        response = self.client.patch(
            self._url(),
            {"picture_password_settings": self._picture_password_settings()},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_forbidden_for_non_admin_user(self):
        self.client.login(username=self.non_admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            self._url(),
            {"picture_password_settings": self._picture_password_settings()},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def _setup_task_mocks(self, mock_storage, mock_task):
        mock_job = Job(func="test_func", facility_id=self.facility.id)
        mock_task.validate_job_data.return_value = (mock_job, {})
        mock_task.enqueue.return_value = "test-job-id"
        mock_enqueued_job = Job(func="test_func", facility_id=self.facility.id)
        mock_enqueued_job.job_id = "test-job-id"
        mock_storage.get_job.return_value = mock_enqueued_job

    @patch(
        "kolibri.core.auth.viewsets.facility_dataset.assign_picture_passwords_to_facility"
    )
    @patch(
        "kolibri.core.auth.viewsets.facility_dataset.are_picture_passwords_exhausted",
        return_value=True,
    )
    def test_enable_rejected_when_exhausted(self, mock_exhausted, mock_task):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            self._url(),
            {"picture_password_settings": self._picture_password_settings()},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        mock_task.validate_job_data.assert_not_called()

    @patch(
        "kolibri.core.auth.viewsets.facility_dataset.assign_picture_passwords_to_facility"
    )
    @patch("kolibri.core.auth.viewsets.facility_dataset.job_storage")
    def test_enable_enqueues_task_and_returns_task_object(
        self, mock_storage, mock_task
    ):
        self._setup_task_mocks(mock_storage, mock_task)
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            self._url(),
            {"picture_password_settings": self._picture_password_settings()},
            format="json",
        )
        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["task"]["id"], "test-job-id")
        self.assertEqual(
            response.data["dataset"]["picture_password_settings"],
            self._picture_password_settings(),
        )
        mock_task.validate_job_data.assert_called_once()
        mock_task.enqueue.assert_called_once()
        dataset = FacilityDataset.objects.get(pk=self.facility.dataset_id)
        self.assertEqual(
            dataset.picture_password_settings, self._picture_password_settings()
        )
        self.assertTrue(dataset.learner_can_login_with_no_password)
        self.assertFalse(dataset.learner_can_edit_password)

    @patch(
        "kolibri.core.auth.viewsets.facility_dataset.assign_picture_passwords_to_facility"
    )
    def test_update_settings_does_not_enqueue_task(self, mock_task):
        dataset = self.facility.dataset
        dataset.picture_password_settings = self._picture_password_settings()
        dataset.learner_can_login_with_no_password = True
        dataset.learner_can_edit_password = False
        dataset.save()
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        new_settings = {"icon_style": "colorful", "show_icon_text": False}
        response = self.client.patch(
            self._url(),
            {"picture_password_settings": new_settings},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        mock_task.validate_job_data.assert_not_called()
        dataset.refresh_from_db()
        self.assertEqual(dataset.picture_password_settings, new_settings)

    @patch(
        "kolibri.core.auth.viewsets.facility_dataset.assign_picture_passwords_to_facility"
    )
    def test_disable_to_username_only(self, mock_task):
        dataset = self.facility.dataset
        dataset.picture_password_settings = self._picture_password_settings()
        dataset.learner_can_login_with_no_password = True
        dataset.learner_can_edit_password = False
        dataset.save()
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            self._url(),
            {
                "picture_password_settings": None,
                "learner_can_login_with_no_password": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        mock_task.validate_job_data.assert_not_called()
        dataset.refresh_from_db()
        self.assertIsNone(dataset.picture_password_settings)
        self.assertTrue(dataset.learner_can_login_with_no_password)
        self.assertFalse(dataset.learner_can_edit_password)

    @patch(
        "kolibri.core.auth.viewsets.facility_dataset.assign_picture_passwords_to_facility"
    )
    def test_disable_to_username_and_password(self, mock_task):
        dataset = self.facility.dataset
        dataset.picture_password_settings = self._picture_password_settings()
        dataset.learner_can_login_with_no_password = True
        dataset.learner_can_edit_password = False
        dataset.save()
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.patch(
            self._url(),
            {
                "picture_password_settings": None,
                "learner_can_login_with_no_password": False,
                "learner_can_edit_password": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        mock_task.validate_job_data.assert_not_called()
        dataset.refresh_from_db()
        self.assertIsNone(dataset.picture_password_settings)
        self.assertFalse(dataset.learner_can_login_with_no_password)
        self.assertTrue(dataset.learner_can_edit_password)

    @patch(
        "kolibri.core.auth.viewsets.facility_dataset.assign_picture_passwords_to_facility"
    )
    @patch("kolibri.core.auth.viewsets.facility_dataset.job_storage")
    def test_enable_does_not_assign_inline(self, mock_storage, mock_task):
        self._setup_task_mocks(mock_storage, mock_task)
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        self.client.patch(
            self._url(),
            {"picture_password_settings": self._picture_password_settings()},
            format="json",
        )
        mock_task.assert_not_called()


@patch("kolibri.core.auth.tasks.get_current_job", return_value=None)
@patch("kolibri.core.auth.tasks.assign_picture_password")
class AssignPicturePasswordsTaskTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()

    def _create_learner(self, username, picture_password=None):
        user = FacilityUserFactory.create(facility=self.facility, username=username)
        if picture_password:
            user.picture_password = picture_password
            user.save(update_fields=["picture_password"])
        return user

    def test_assigns_to_learners_without_picture_password(
        self, mock_assign, mock_get_job
    ):
        learner1 = self._create_learner("learner1")
        learner2 = self._create_learner("learner2")
        assign_picture_passwords_to_facility(self.facility.id)
        called_user_ids = {c[0][0].id for c in mock_assign.call_args_list}
        self.assertIn(learner1.id, called_user_ids)
        self.assertIn(learner2.id, called_user_ids)

    def test_skips_learners_with_existing_picture_password(
        self, mock_assign, mock_get_job
    ):
        self._create_learner("already_has", picture_password="1.2.3")
        learner_without = self._create_learner("needs_one")
        assign_picture_passwords_to_facility(self.facility.id)
        called_user_ids = {c[0][0].id for c in mock_assign.call_args_list}
        self.assertNotIn(
            FacilityUser.objects.get(username="already_has").id, called_user_ids
        )
        self.assertIn(learner_without.id, called_user_ids)

    def test_skips_coaches_and_admins(self, mock_assign, mock_get_job):
        admin = FacilityUserFactory.create(
            facility=self.facility, username="admin_user"
        )
        self.facility.add_admin(admin)
        coach = FacilityUserFactory.create(
            facility=self.facility, username="coach_user"
        )
        self.facility.add_coach(coach)
        learner = self._create_learner("just_a_learner")
        assign_picture_passwords_to_facility(self.facility.id)
        called_user_ids = {c[0][0].id for c in mock_assign.call_args_list}
        self.assertNotIn(admin.id, called_user_ids)
        self.assertNotIn(coach.id, called_user_ids)
        self.assertIn(learner.id, called_user_ids)

    def test_raises_on_no_available_sequences(self, mock_assign, mock_get_job):
        mock_assign.side_effect = NoAvailableSequences("No sequences left")
        self._create_learner("victim")
        with self.assertRaises(NoAvailableSequences):
            assign_picture_passwords_to_facility(self.facility.id)


class IsPINValidAPITestCase(APITestCase):
    databases = "__all__"

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
    databases = "__all__"

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
        # users for bulk create tests (no pre-existing memberships)
        cls.bulk_user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.bulk_user2 = FacilityUserFactory.create(facility=cls.facility)
        cls.bulk_user3 = FacilityUserFactory.create(facility=cls.facility)

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

    def test_bulk_create_memberships(self):
        self.login_superuser()
        url = reverse("kolibri:core:membership-list")
        data = [
            {"user": self.bulk_user1.id, "collection": self.classroom.id},
            {"user": self.bulk_user2.id, "collection": self.classroom.id},
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            models.Membership.objects.filter(
                user=self.bulk_user1, collection=self.classroom
            ).exists()
        )
        self.assertTrue(
            models.Membership.objects.filter(
                user=self.bulk_user2, collection=self.classroom
            ).exists()
        )

    def test_bulk_create_memberships_have_valid_morango_fields(self):
        self.login_superuser()
        url = reverse("kolibri:core:membership-list")
        data = [
            {"user": self.bulk_user1.id, "collection": self.classroom.id},
            {"user": self.bulk_user2.id, "collection": self.classroom.id},
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        for m_data in response.data:
            membership = models.Membership.objects.get(id=m_data["id"])
            self.assertEqual(len(membership.id), 32)
            self.assertIsNotNone(membership._morango_partition)
            self.assertIsNotNone(membership._morango_source_id)
            self.assertTrue(membership._morango_dirty_bit)

    def test_bulk_create_memberships_idempotent(self):
        self.login_superuser()
        models.Membership.objects.create(
            user=self.bulk_user1, collection=self.classroom
        )
        url = reverse("kolibri:core:membership-list")
        data = [
            {"user": self.bulk_user1.id, "collection": self.classroom.id},
            {"user": self.bulk_user2.id, "collection": self.classroom.id},
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.bulk_user2.id)

    def test_bulk_create_learnergroup_membership_requires_classroom_membership(self):
        self.login_superuser()
        url = reverse("kolibri:core:membership-list")
        data = [
            {"user": self.bulk_user3.id, "collection": self.lg.id},
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 400)

    def test_bulk_create_facility_membership_rejected(self):
        self.login_superuser()
        url = reverse("kolibri:core:membership-list")
        data = [
            {"user": self.bulk_user1.id, "collection": self.facility.id},
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 400)

    def test_bulk_create_memberships_query_count_does_not_scale(self):
        """Verify our serializer's validate/create use O(1) queries, not O(N)."""
        self.login_superuser()
        url = reverse("kolibri:core:membership-list")

        # Batch of 1
        user_a = FacilityUserFactory.create(facility=self.facility)
        data_1 = [
            {"user": user_a.id, "collection": self.classroom.id},
        ]
        with CaptureQueriesContext(connection) as ctx_1:
            response = self.client.post(url, data_1, format="json")
        self.assertEqual(response.status_code, 201)

        # Batch of 3
        user_b = FacilityUserFactory.create(facility=self.facility)
        user_c = FacilityUserFactory.create(facility=self.facility)
        user_d = FacilityUserFactory.create(facility=self.facility)
        data_3 = [
            {"user": user_b.id, "collection": self.classroom.id},
            {"user": user_c.id, "collection": self.classroom.id},
            {"user": user_d.id, "collection": self.classroom.id},
        ]
        with CaptureQueriesContext(connection) as ctx_3:
            response = self.client.post(url, data_3, format="json")
        self.assertEqual(response.status_code, 201)

        # DRF's PrimaryKeyRelatedField adds O(N) queries for field resolution
        # and permissions/serialization add further per-item overhead,
        # but our serializer's validate() and create() should use a fixed number.
        # The key assertion is that query growth is linear (not quadratic).
        actual_diff = len(ctx_3) - len(ctx_1)
        extra_items = 2  # 3-item batch has 2 more items than 1-item batch
        max_per_item_overhead = 10
        self.assertLessEqual(actual_diff, max_per_item_overhead * extra_items)

    def test_prepare_for_bulk_create_sets_morango_fields(self):
        membership = models.Membership(user=self.bulk_user1, collection=self.classroom)
        _prepare_for_bulk_create(membership)
        self.assertEqual(len(membership.id), 32)
        self.assertIsNotNone(membership._morango_partition)
        self.assertIsNotNone(membership._morango_source_id)
        self.assertTrue(membership._morango_dirty_bit)


class GroupMembership(APITestCase):
    databases = "__all__"

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
    databases = "__all__"

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
    @classmethod
    def setUpTestData(cls):
        cls.url = reverse("kolibri:core:setnonspecifiedpassword")
        cls.facility = FacilityFactory.create()
        cls.user = models.FacilityUser.objects.create(
            username="testuser",
            facility=cls.facility,
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


class DeleteImportedUserTestCase(APITransactionTestCase):
    databases = "__all__"

    def setUp(self):
        super().setUp()
        provision_device()
        self.facility = FacilityFactory.create()

        self.admin = FacilityUserFactory.create(
            facility=self.facility, username="admin"
        )
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()
        self.facility.add_admin(self.admin)

        self.user = FacilityUserFactory.create(facility=self.facility, username="user")
        self.user.set_password(DUMMY_PASSWORD)
        self.user.save()

        self.user_patitions = [
            f"{self.user.dataset_id}:user-ro:{self.user.id}",
            f"{self.user.dataset_id}:user-rw:{self.user.id}",
        ]

        # Simulate morango records as if the user was imported from other instance
        MorangoProfileController(PROFILE_FACILITY_DATA).serialize_into_store(
            self.user_patitions
        )

        # Avoid queries to the notifications database when deleting a user
        pre_delete.disconnect(cascade_delete_user, sender=FacilityUser)

    def tearDown(self):
        super().tearDown()
        pre_delete.connect(cascade_delete_user, sender=FacilityUser)

    def login_admin(self):
        self.client.login(
            username=self.admin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def login_user(self):
        self.client.login(
            username=self.user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_non_admin_cannot_remove_user(self):
        self.login_user()

        response = self.client.delete(
            reverse(
                "kolibri:core:deleteimporteduser", kwargs={"user_id": self.user.id}
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_user_id(self):
        self.login_admin()

        response = self.client.delete(
            reverse("kolibri:core:deleteimporteduser", kwargs={"user_id": "a" * 32}),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_delete(self):
        self.login_admin()

        response = self.client.delete(
            reverse(
                "kolibri:core:deleteimporteduser", kwargs={"user_id": self.user.id}
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertFalse(models.FacilityUser.objects.filter(id=self.user.id).exists())

        # Check if morango records were deleted
        self.assertFalse(
            Certificate.objects.filter(
                scope_params__contains=self.user_patitions
            ).exists()
        )
        self.assertFalse(
            Store.objects.filter(partition__in=self.user_patitions).exists()
        )
        self.assertFalse(
            DatabaseMaxCounter.objects.filter(
                partition__in=self.user_patitions
            ).exists()
        )

        # Check that there isn't any record in morango DeletedModels nor HardDeletedModels
        # as we should not propagate deletion of these models to remote devices
        self.assertFalse(DeletedModels.objects.exists())
        self.assertFalse(HardDeletedModels.objects.exists())


class RemoteAccessSessionTestCase(APITestCase):
    """Tests for allow_other_browsers_to_connect enforcement in SessionViewSet.create()"""

    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def _login(self):
        return self.client.post(
            reverse("kolibri:core:session-list"),
            data={
                "username": self.user.username,
                "password": DUMMY_PASSWORD,
                "facility": self.facility.id,
            },
            format="json",
        )

    @patch(
        "kolibri.core.auth.viewsets.session.valid_app_key_on_request",
        return_value=False,
    )
    @patch(
        "kolibri.core.auth.viewsets.session.allow_other_browsers_to_connect",
        return_value=False,
    )
    def test_login_blocked_when_remote_access_disabled_in_app_context(
        self, mock_allow, mock_app_key
    ):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data[0]["id"], error_constants.INVALID_CREDENTIALS)

    @patch(
        "kolibri.core.auth.viewsets.session.valid_app_key_on_request",
        return_value=False,
    )
    @patch(
        "kolibri.core.auth.viewsets.session.allow_other_browsers_to_connect",
        return_value=True,
    )
    def test_login_allowed_when_remote_access_enabled_in_app_context(
        self, mock_allow, mock_app_key
    ):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch(
        "kolibri.core.auth.viewsets.session.valid_app_key_on_request", return_value=True
    )
    @patch(
        "kolibri.core.auth.viewsets.session.allow_other_browsers_to_connect",
        return_value=False,
    )
    def test_login_allowed_with_app_key_when_remote_access_disabled(
        self, mock_allow, mock_app_key
    ):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch(
        "kolibri.core.auth.viewsets.session.valid_app_key_on_request",
        return_value=False,
    )
    @patch(
        "kolibri.core.auth.viewsets.session.allow_other_browsers_to_connect",
        return_value=True,
    )
    def test_login_allowed_when_not_in_app_context(self, mock_allow, mock_app_key):
        response = self._login()
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class KolibriDataPortalViewSetTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility, cls.superuser = setup_device()

    def setUp(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

    @patch("kolibri.core.api.enqueue_automatic_kdp_sync")
    @patch("kolibri.core.api.registerfacility")
    def test_register_enqueues_automatic_sync(
        self, mock_registerfacility, mock_enqueue_sync
    ):
        mock_registerfacility.return_value.status_code = 200
        self.client.post(
            reverse("kolibri:core:portal-register"),
            {"facility_id": self.facility.id, "token": "test-token"},
            format="json",
        )
        mock_enqueue_sync.assert_called_once_with(self.facility)

    def _register(self):
        return self.client.post(
            reverse("kolibri:core:portal-register"),
            {"facility_id": self.facility.id, "token": "test-token"},
            format="json",
        )

    @patch(
        "kolibri.core.api.registerfacility",
        side_effect=NetworkLocationConnectionFailure,
    )
    def test_register_offline(self, mock_registerfacility):
        response = self._register()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @patch(
        "kolibri.core.api.registerfacility",
        side_effect=NetworkLocationResponseFailure(response=None),
    )
    def test_register_response_failure_without_response(self, mock_registerfacility):
        response = self._register()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @patch("kolibri.core.api.registerfacility")
    def test_register_non_json_error_response(self, mock_registerfacility):
        portal_response = Mock(status_code=521, content=b"<html>error</html>")
        portal_response.json.side_effect = ValueError
        mock_registerfacility.side_effect = NetworkLocationResponseFailure(
            response=portal_response
        )
        response = self._register()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @patch("kolibri.core.api.registerfacility")
    def test_register_reflects_portal_error_constants(self, mock_registerfacility):
        portal_response = Mock(status_code=400)
        portal_response.json.return_value = [
            {"id": "ALREADY_REGISTERED_FOR_COMMUNITY", "metadata": {"some": "detail"}},
            {"id": "SOME_UNRECOGNIZED_ERROR"},
        ]
        mock_registerfacility.side_effect = NetworkLocationResponseFailure(
            response=portal_response
        )
        response = self._register()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), [{"id": "ALREADY_REGISTERED_FOR_COMMUNITY"}])

    def _validate_token(self):
        return self.client.get(
            reverse("kolibri:core:portal-validate-token"), {"token": "test-token"}
        )

    @patch.object(
        NetworkClient,
        "get",
        side_effect=NetworkLocationResponseFailure(response=None),
    )
    def test_validate_token_response_failure_without_response(self, mock_get):
        response = self._validate_token()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @patch.object(NetworkClient, "get", side_effect=NetworkLocationResponseTimeout)
    def test_validate_token_timeout(self, mock_get):
        response = self._validate_token()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @patch.object(NetworkClient, "get")
    def test_validate_token_non_json_error_response(self, mock_get):
        portal_response = Mock(status_code=521, content=b"<html>error</html>")
        portal_response.json.side_effect = ValueError
        mock_get.side_effect = NetworkLocationResponseFailure(response=portal_response)
        response = self._validate_token()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.json()["status"], "offline")

    @patch.object(NetworkClient, "get")
    def test_validate_token_reflects_invalid_token_error(self, mock_get):
        portal_response = Mock(status_code=400)
        portal_response.json.return_value = [{"id": "INVALID_KDP_REGISTRATION_TOKEN"}]
        mock_get.side_effect = NetworkLocationResponseFailure(response=portal_response)
        response = self._validate_token()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json(), [{"id": "INVALID_KDP_REGISTRATION_TOKEN"}])

    @patch.object(NetworkClient, "get")
    def test_validate_token_returns_project_name(self, mock_get):
        portal_response = Mock(status_code=200)
        portal_response.json.return_value = {
            "name": "My Project",
            "internal": "detail",
        }
        mock_get.return_value = portal_response
        response = self._validate_token()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"name": "My Project"})


class PicturePasswordSerializerTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.learner_with_password = FacilityUserFactory.create(facility=cls.facility)
        cls.learner_with_password.picture_password = "1.2.3"
        cls.learner_with_password.save()
        cls.learner_no_password = FacilityUserFactory.create(facility=cls.facility)

    def login(self, user):
        self.client.login(
            username=user.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def detail_url(self, pk):
        return reverse("kolibri:core:facilityuser-detail", kwargs={"pk": pk})

    def test_serializer_includes_picture_password_in_output(self):
        self.login(self.superuser)
        response = self.client.get(self.detail_url(self.learner_with_password.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("picture_password", response.data)
        self.assertEqual(response.data["picture_password"], "1.2.3")

    def test_picture_password_is_null_when_unassigned(self):
        self.login(self.superuser)
        response = self.client.get(self.detail_url(self.learner_no_password.id))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("picture_password", response.data)
        self.assertIsNone(response.data["picture_password"])


class RoleAPITestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.classroom = ClassroomFactory.create(parent=cls.facility)
        cls.lg = LearnerGroupFactory.create(parent=cls.classroom)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_bulk_create_multiple_roles(self):
        url = reverse("kolibri:core:role-list")
        data = [
            {
                "user": self.user1.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
            {
                "user": self.user2.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            models.Role.objects.filter(
                user=self.user1, collection=self.classroom, kind=role_kinds.COACH
            ).exists()
        )
        self.assertTrue(
            models.Role.objects.filter(
                user=self.user2, collection=self.classroom, kind=role_kinds.COACH
            ).exists()
        )

    def test_bulk_create_duplicate_roles_idempotent(self):
        models.Role.objects.create(
            user=self.user1, collection=self.classroom, kind=role_kinds.COACH
        )
        url = reverse("kolibri:core:role-list")
        data = [
            {
                "user": self.user1.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
            {
                "user": self.user2.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        # Only the new role should be in the response
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user2.id)

    def test_bulk_create_classroom_coach_creates_assignable_coach_role(self):
        url = reverse("kolibri:core:role-list")
        data = [
            {
                "user": self.user1.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            models.Role.objects.filter(
                user=self.user1,
                collection=self.facility,
                kind=role_kinds.ASSIGNABLE_COACH,
            ).exists()
        )

    def test_bulk_create_classroom_coach_no_duplicate_assignable_coach(self):
        # User already has a facility role
        models.Role.objects.create(
            user=self.user1, collection=self.facility, kind=role_kinds.ADMIN
        )
        url = reverse("kolibri:core:role-list")
        data = [
            {
                "user": self.user1.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertFalse(
            models.Role.objects.filter(
                user=self.user1,
                collection=self.facility,
                kind=role_kinds.ASSIGNABLE_COACH,
            ).exists()
        )

    def test_bulk_create_facility_admin_roles(self):
        url = reverse("kolibri:core:role-list")
        data = [
            {
                "user": self.user1.id,
                "collection": self.facility.id,
                "kind": role_kinds.ADMIN,
            },
            {
                "user": self.user2.id,
                "collection": self.facility.id,
                "kind": role_kinds.ADMIN,
            },
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data), 2)
        self.assertTrue(
            models.Role.objects.filter(
                user=self.user1, collection=self.facility, kind=role_kinds.ADMIN
            ).exists()
        )
        self.assertTrue(
            models.Role.objects.filter(
                user=self.user2, collection=self.facility, kind=role_kinds.ADMIN
            ).exists()
        )

    def test_bulk_create_roles_have_valid_morango_fields(self):
        url = reverse("kolibri:core:role-list")
        data = [
            {
                "user": self.user1.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
            {
                "user": self.user2.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 201)
        for role_data in response.data:
            role = models.Role.objects.get(id=role_data["id"])
            self.assertEqual(len(role.id), 32)
            self.assertIsNotNone(role._morango_partition)
            self.assertIsNotNone(role._morango_source_id)
            self.assertTrue(role._morango_dirty_bit)

    def test_bulk_create_learnergroup_role_rejected(self):
        url = reverse("kolibri:core:role-list")
        data = [
            {
                "user": self.user1.id,
                "collection": self.lg.id,
                "kind": role_kinds.COACH,
            },
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, 400)

    def test_bulk_create_query_count_does_not_scale(self):
        """Verify our serializer's validate/create use O(1) queries, not O(N)."""
        url = reverse("kolibri:core:role-list")

        # Batch of 1
        user_a = FacilityUserFactory.create(facility=self.facility)
        data_1 = [
            {
                "user": user_a.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
        ]
        with CaptureQueriesContext(connection) as ctx_1:
            response = self.client.post(url, data_1, format="json")
        self.assertEqual(response.status_code, 201)

        # Batch of 3
        user_b = FacilityUserFactory.create(facility=self.facility)
        user_c = FacilityUserFactory.create(facility=self.facility)
        user_d = FacilityUserFactory.create(facility=self.facility)
        data_3 = [
            {
                "user": user_b.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
            {
                "user": user_c.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
            {
                "user": user_d.id,
                "collection": self.classroom.id,
                "kind": role_kinds.COACH,
            },
        ]
        with CaptureQueriesContext(connection) as ctx_3:
            response = self.client.post(url, data_3, format="json")
        self.assertEqual(response.status_code, 201)

        # DRF's PrimaryKeyRelatedField adds O(N) queries for field resolution
        # and permissions/serialization add further per-item overhead,
        # but our serializer's validate() and create() should use a fixed number.
        # The key assertion is that query growth is linear (not quadratic).
        actual_diff = len(ctx_3) - len(ctx_1)
        extra_items = 2  # 3-item batch has 2 more items than 1-item batch
        max_per_item_overhead = 10
        self.assertLessEqual(actual_diff, max_per_item_overhead * extra_items)

    def test_single_role_model_creation_clears_picture_password(self):
        """Role.objects.create() (which calls Role.save()) clears picture_password."""
        user = models.FacilityUser.objects.create_user(
            username="picmodeluser",
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        user.picture_password = "1.2.3"
        user.save(update_fields=["picture_password"])
        models.Role.objects.create(
            user=user,
            collection=self.facility,
            kind=role_kinds.ADMIN,
        )
        user.refresh_from_db()
        self.assertIsNone(user.picture_password)

    def test_single_role_api_creation_clears_picture_password(self):
        """Single-role POST to role-list API clears picture_password."""
        self.user1.picture_password = "7.8.9"
        self.user1.save(update_fields=["picture_password"])
        url = reverse("kolibri:core:role-list")
        response = self.client.post(
            url,
            {
                "user": self.user1.id,
                "collection": self.facility.id,
                "kind": role_kinds.ADMIN,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.user1.refresh_from_db()
        self.assertIsNone(self.user1.picture_password)
        self.assertTrue(
            models.Role.objects.filter(
                user=self.user1, collection=self.facility, kind=role_kinds.ADMIN
            ).exists()
        )

    def test_bulk_role_creation_clears_picture_password(self):
        """Bulk role POST (bulk_create path) clears picture_password for all affected users."""
        self.user1.picture_password = "1.2.3"
        self.user1.save(update_fields=["picture_password"])
        self.user2.picture_password = "4.5.6"
        self.user2.save(update_fields=["picture_password"])
        url = reverse("kolibri:core:role-list")
        data = [
            {
                "user": self.user1.id,
                "collection": self.facility.id,
                "kind": role_kinds.ADMIN,
            },
            {
                "user": self.user2.id,
                "collection": self.facility.id,
                "kind": role_kinds.ADMIN,
            },
        ]
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.user1.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertIsNone(self.user1.picture_password)
        self.assertIsNone(self.user2.picture_password)
        self.assertTrue(
            models.Role.objects.filter(
                user=self.user1, collection=self.facility, kind=role_kinds.ADMIN
            ).exists()
        )
        self.assertTrue(
            models.Role.objects.filter(
                user=self.user2, collection=self.facility, kind=role_kinds.ADMIN
            ).exists()
        )

    def test_prepare_for_bulk_create_sets_morango_fields(self):
        role = models.Role(
            user=self.user1, collection=self.classroom, kind=role_kinds.COACH
        )
        _prepare_for_bulk_create(role)
        self.assertEqual(len(role.id), 32)
        self.assertIsNotNone(role._morango_partition)
        self.assertIsNotNone(role._morango_source_id)
        self.assertTrue(role._morango_dirty_bit)

    def test_prepare_for_bulk_create_uuid_is_deterministic(self):
        role1 = models.Role(
            user=self.user1, collection=self.classroom, kind=role_kinds.COACH
        )
        role2 = models.Role(
            user=self.user1, collection=self.classroom, kind=role_kinds.COACH
        )
        _prepare_for_bulk_create(role1)
        _prepare_for_bulk_create(role2)
        self.assertEqual(role1.id, role2.id)


class RoleDeletePicturePasswordTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = models.Facility.objects.create(name="RoleDeletePicPwdFacility")
        cls.superuser = create_superuser(cls.facility)
        # Both fields must be set together before save() to avoid IncompatibleDeviceSettingError
        cls.facility.dataset.learner_can_edit_password = False
        cls.facility.dataset.picture_password_settings = {
            "icon_style": "standard",
            "show_icon_text": False,
        }
        cls.facility.dataset.save()

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def _make_user_with_role(self, username, kind=role_kinds.ADMIN):
        user = models.FacilityUser.objects.create_user(
            username=username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        role = models.Role.objects.create(
            user=user,
            collection=self.facility,
            kind=kind,
        )
        return user, role

    def test_last_role_deleted_assigns_picture_password(self):
        """After deleting a user's only role, a picture_password is assigned when
        picture_password_settings is enabled and no password exists yet."""
        user, role = self._make_user_with_role("lastroledeleted")
        self.assertIsNone(user.picture_password)

        role.delete()

        user.refresh_from_db()
        self.assertIsNotNone(user.picture_password)
        parts = user.picture_password.split(".")
        self.assertEqual(len(parts), 3)
        self.assertTrue(all(p.isdigit() for p in parts))

    def test_remaining_role_prevents_picture_password_assignment(self):
        """Deleting one role when a user still has another role does NOT assign
        a picture_password."""
        user, role1 = self._make_user_with_role("tworoles1", kind=role_kinds.ADMIN)
        classroom = models.Classroom.objects.create(
            name="TestClassroom", parent=self.facility
        )
        role2 = models.Role.objects.create(
            user=user,
            collection=classroom,
            kind=role_kinds.COACH,
        )

        role1.delete()

        user.refresh_from_db()
        self.assertIsNone(user.picture_password)
        self.assertTrue(models.Role.objects.filter(pk=role2.pk).exists())

    def test_existing_picture_password_not_overwritten(self):
        """If the user already has a picture_password when their last role is
        deleted, it is not reassigned."""
        user, role = self._make_user_with_role("alreadyhaspic")
        # Bypass Role.save() clearing by directly setting on DB
        models.FacilityUser.objects.filter(pk=user.pk).update(picture_password="1.2.3")

        role.delete()

        user.refresh_from_db()
        self.assertEqual(user.picture_password, "1.2.3")

    @patch(
        "kolibri.core.auth.utils.picture_passwords.LEARNER_PICTURE_PASSWORD_LIMIT", 0
    )
    def test_at_learner_limit_no_assignment_no_exception(self):
        """At or above the learner limit, no picture_password is assigned and
        no exception is raised."""
        user, role = self._make_user_with_role("atlimit")

        role.delete()  # must not raise

        user.refresh_from_db()
        self.assertIsNone(user.picture_password)

    @patch(
        "kolibri.core.auth.utils.picture_passwords.assign_picture_password",
        side_effect=NoAvailableSequences,
    )
    def test_no_available_sequences_caught_silently(self, mock_assign):
        """If assign_picture_password raises NoAvailableSequences, the exception
        is caught and picture_password remains None."""
        user, role = self._make_user_with_role("nosequences")

        role.delete()  # must not raise

        user.refresh_from_db()
        self.assertIsNone(user.picture_password)


class RoleDeleteNoPicSettingsTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = models.Facility.objects.create(name="RoleDeleteNoPicFacility")
        cls.superuser = create_superuser(cls.facility)

    def test_last_role_deleted_no_assignment_when_picture_password_settings_null(self):
        """When picture_password_settings is None, deleting a user's last role does
        not assign a picture_password."""
        user = models.FacilityUser.objects.create_user(
            username="nopicsettings",
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        role = models.Role.objects.create(
            user=user,
            collection=self.facility,
            kind=role_kinds.ADMIN,
        )

        role.delete()

        user.refresh_from_db()
        self.assertIsNone(user.picture_password)


class FacilityUserSerializerPicturePasswordTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = models.Facility.objects.create(name="PicPwdTestFacility")
        cls.superuser = create_superuser(cls.facility)
        # FacilityDataset.ensure_compatibility() raises IncompatibleDeviceSettingError
        # if picture_password_settings is set while learner_can_edit_password is True.
        # Both must be set on the object before calling save().
        cls.facility.dataset.learner_can_edit_password = False
        cls.facility.dataset.picture_password_settings = {
            "icon_style": "standard",
            "show_icon_text": False,
        }
        cls.facility.dataset.save()

    def setUp(self):
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

    def test_new_learner_gets_picture_password_when_feature_enabled(self):
        """Learner created in a picture-login facility below the limit gets a picture_password."""
        response = self._create_user_via_api()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = models.FacilityUser.objects.get(id=response.data["id"])
        self.assertIsNotNone(user.picture_password)
        parts = user.picture_password.split(".")
        self.assertEqual(len(parts), 3)
        self.assertTrue(all(p.isdigit() for p in parts))

    def test_new_learner_no_picture_password_when_settings_null(self):
        """Learner created in a facility where picture_password_settings=None gets no picture_password."""
        self.facility.dataset.picture_password_settings = None
        self.facility.dataset.learner_can_edit_password = True
        self.facility.dataset.save()
        response = self._create_user_via_api()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = models.FacilityUser.objects.get(id=response.data["id"])
        self.assertIsNone(user.picture_password)

    @patch(
        "kolibri.core.auth.utils.picture_passwords.LEARNER_PICTURE_PASSWORD_LIMIT", 2
    )
    def test_new_learner_no_picture_password_when_learner_count_at_limit(self):
        """Learner creation succeeds without picture_password when facility is at or above the limit."""
        FacilityUserFactory.create(facility=self.facility)
        FacilityUserFactory.create(facility=self.facility)

        response = self._create_user_via_api()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = models.FacilityUser.objects.get(id=response.data["id"])
        self.assertIsNone(user.picture_password)


class PicturePasswordPrevalidateTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.other_facility = FacilityFactory.create()
        cls.learner = FacilityUserFactory.create(facility=cls.facility)
        cls.learner.picture_password = "1.2.3"
        cls.learner.save(update_fields=["picture_password"])

    def setUp(self):
        enable_picture_password(self.facility)

    def _url(self):
        return reverse("kolibri:core:session-list") + "?prevalidate=true"

    def test_valid_picture_password_returns_full_name(self):
        response = self.client.post(
            self._url(),
            data={"picture_password": "1.2.3", "facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["full_name"], self.learner.full_name)

    def test_valid_picture_password_does_not_create_session(self):
        self.client.post(
            self._url(),
            data={"picture_password": "1.2.3", "facility": self.facility.id},
            format="json",
        )
        self.assertFalse(self.client.session.get("_auth_user_id"))

    def test_wrong_picture_password_returns_not_found(self):
        response = self.client.post(
            self._url(),
            data={"picture_password": "9.9.9", "facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)

    def test_wrong_facility_returns_not_found(self):
        response = self.client.post(
            self._url(),
            data={"picture_password": "1.2.3", "facility": self.other_facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)

    def test_non_learner_not_authenticated_via_picture_password(self):
        coach = FacilityUserFactory.create(facility=self.facility)
        coach.picture_password = "4.5.6"
        coach.save(update_fields=["picture_password"])
        self.facility.add_coach(coach)
        response = self.client.post(
            self._url(),
            data={"picture_password": "4.5.6", "facility": self.facility.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data[0]["id"], error_constants.NOT_FOUND)


class RemoteFacilityResponseSanitizationMixin:
    """Shared assertions for endpoints that reflect a remote user list."""

    valid_item = None

    def _call_with_payload(self, payload):
        raise NotImplementedError

    def test_well_formed_response_passes_through(self):
        response = self._call_with_payload([self.valid_item])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [self.valid_item])

    def test_extra_keys_are_stripped(self):
        smuggled = dict(self.valid_item, password="leaked-secret", token="AKIA...")
        response = self._call_with_payload([smuggled])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [self.valid_item])


class RemoteFacilityUserViewsetTestCase(
    RemoteFacilityResponseSanitizationMixin, APITestCase
):
    valid_item = {"id": "00000000000000000000000000000001", "username": "alice"}

    def _call_with_payload(self, payload):
        with patch(
            "kolibri.core.auth.viewsets.auth_views.NetworkClient"
        ) as NetworkClient:
            client = NetworkClient.build_for_address.return_value
            client.get.return_value.json.return_value = payload
            return self.client.get(
                reverse("kolibri:core:remotefacilityuser"),
                {
                    "baseurl": "http://remote.example",
                    "username": "alice",
                    "facility": uuid.uuid4().hex,
                },
            )

    def test_non_list_response_returns_empty_list(self):
        response = self._call_with_payload({"my_secret": "AKIA..."})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_passwordless_facility_response_with_null_id_passes_through(self):
        payload = [{"id": None, "username": "alice"}]
        response = self._call_with_payload(payload)
        self.assertEqual(response.data, payload)

    def test_any_invalid_item_rejects_whole_response(self):
        valid_id = uuid.uuid4().hex
        response = self._call_with_payload(
            [
                {"id": valid_id, "username": "alice"},
                "not a dict",
            ]
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    def test_invalid_uuid_id_rejects_whole_response(self):
        response = self._call_with_payload([{"id": "not-a-uuid", "username": "alice"}])
        self.assertEqual(response.data, [])

    def test_anonymous_request_to_provisioned_device_is_rejected(self):
        provision_device()
        response = self._call_with_payload([self.valid_item])
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RemoteFacilityUserAuthenticatedViewsetTestCase(
    RemoteFacilityResponseSanitizationMixin, APITestCase
):
    valid_item = {
        "id": "00000000000000000000000000000001",
        "username": "alice",
        "full_name": "Alice",
        "facility": "00000000000000000000000000000002",
        "roles": ["admin"],
        "is_superuser": False,
        "id_number": "",
        "gender": "NOT_SPECIFIED",
        "birth_year": "NOT_SPECIFIED",
    }

    def _call_with_payload(self, payload):
        with patch("kolibri.core.auth.utils.users.NetworkClient") as NetworkClient:
            client = NetworkClient.build_for_address.return_value
            client.get.return_value.json.return_value = payload
            return self.client.post(
                reverse("kolibri:core:remotefacilityauthenticateduserinfo"),
                {
                    "baseurl": "http://remote.example",
                    "username": self.valid_item["username"],
                    "facility_id": self.valid_item["facility"],
                    "password": "anything",
                },
                format="json",
            )

    def test_blank_demographics_pass_through(self):
        item = dict(self.valid_item, id_number="", gender="", birth_year="")
        response = self._call_with_payload([item])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_anonymous_request_to_provisioned_device_is_rejected(self):
        provision_device()
        response = self._call_with_payload([self.valid_item])
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
