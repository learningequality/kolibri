from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import base64
import collections
import sys
from importlib import import_module

import factory
from django.conf import settings
from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.test import APITestCase as BaseTestCase

from .. import models
from ..constants import role_kinds
from ..constants.facility_presets import mappings
from .helpers import create_superuser
from .helpers import DUMMY_PASSWORD
from .helpers import provision_device
from kolibri.core import error_constants
from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.device.utils import set_device_settings

# A weird hack because of http://bugs.python.org/issue17866
if sys.version_info >= (3,):

    class APITestCase(BaseTestCase):
        def assertItemsEqual(self, *args, **kwargs):
            self.assertCountEqual(*args, **kwargs)


else:

    class APITestCase(BaseTestCase):
        pass


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

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_learnergroup_list(self):
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
        # assertItemsEqual does not deal well with embedded objects, as it does
        # not do a deepEqual, so check each individual list of user_ids
        for i, group in enumerate(response.data):
            self.assertItemsEqual(group.pop("user_ids"), expected[i].pop("user_ids"))
        self.assertItemsEqual(response.data, expected)

    def test_learnergroup_detail(self):
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
        self.assertItemsEqual(response.data, expected)

    def test_parent_in_queryparam_with_one_id(self):
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
        # assertItemsEqual does not deal well with embedded objects, as it does
        # not do a deepEqual, so check each individual list of user_ids
        for i, group in enumerate(response.data):
            self.assertItemsEqual(group.pop("user_ids"), expected[i].pop("user_ids"))
        self.assertItemsEqual(response.data, expected)

    def test_cannot_create_learnergroup_same_name(self):
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

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_classroom_list(self):
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
        self.assertItemsEqual(response.data, expected)

    def test_classroom_detail(self):
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

    def test_classroom_detail_assigned_coach_super_user(self):
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
        classroom_name = self.classrooms[0].name
        response = self.client.post(
            reverse("kolibri:core:classroom-list"),
            {"parent": self.facility.id, "name": classroom_name},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_cannot_create_classroom_no_facility_parent(self):
        classroom_id = self.classrooms[0].id
        response = self.client.post(
            reverse("kolibri:core:classroom-list"),
            {"parent": classroom_id, "name": "another name"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FacilityAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility1 = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility1)
        cls.facility2 = FacilityFactory.create()
        cls.user1 = FacilityUserFactory.create(facility=cls.facility1)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility2)

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
        # .assertDictContainsSubset checks that the first argument is a subset of the second argument
        self.assertDictContainsSubset(
            {"name": self.facility1.name}, dict(response.data)
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
        if sys.version_info[0] == 2:
            credentials = base64.b64encode(
                "username={}&{}={}:{}".format(
                    self.user1.username,
                    FACILITY_CREDENTIAL_KEY,
                    self.facility1.id,
                    DUMMY_PASSWORD,
                ).encode("utf-8")
            )
        else:
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
        if sys.version_info[0] == 2:
            credentials = base64.b64encode(
                "username={}&{}={}:{}".format(
                    self.superuser.username,
                    FACILITY_CREDENTIAL_KEY,
                    self.facility1.id,
                    DUMMY_PASSWORD,
                ).encode("utf-8")
            )
        else:
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


class UserUpdateTestCase(APITestCase):
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


class UserDeleteTestCase(APITestCase):
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

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_user_list(self):
        response = self.client.get(reverse("kolibri:core:facilityuser-list"))
        self.assertEqual(response.status_code, 200)
        self.assertItemsEqual(
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
                    "is_superuser": False,
                    "roles": [],
                },
                {
                    "id": self.superuser.id,
                    "username": self.superuser.username,
                    "full_name": self.superuser.full_name,
                    "facility": self.superuser.facility_id,
                    "id_number": self.superuser.id_number,
                    "gender": self.superuser.gender,
                    "birth_year": self.superuser.birth_year,
                    "is_superuser": True,
                    "roles": [
                        {
                            "collection": self.superuser.roles.first().collection_id,
                            "kind": role_kinds.ADMIN,
                            "id": self.superuser.roles.first().id,
                        }
                    ],
                },
            ],
        )


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
        self.client.get(
            reverse("kolibri:core:session-detail", kwargs={"pk": "current"})
        )
        new_expire_date = self.client.session.get_expiry_date()
        self.assertTrue(expire_date < new_expire_date)


class AnonSignUpTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        provision_device()

    def post_to_sign_up(self, data):
        return self.client.post(
            reverse("kolibri:core:signup-list"), data=data, format="json"
        )

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

    def test_create_bad_username_fails(self):
        response = self.post_to_sign_up(
            {"username": "(***)", "password": DUMMY_PASSWORD}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(models.FacilityUser.objects.all())

    def test_sign_up_also_logs_in_user(self):
        session_key = self.client.session.session_key
        self.post_to_sign_up({"username": "user", "password": DUMMY_PASSWORD})
        self.assertNotEqual(session_key, self.client.session.session_key)

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
            {"username": "user", "password": "NOT_SPECIFIED"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(models.FacilityUser.objects.all())

    def test_password_not_specified_password_not_required(self):
        self.facility.dataset.learner_can_login_with_no_password = True
        self.facility.dataset.learner_can_edit_password = False
        self.facility.dataset.save()
        response = self.post_to_sign_up(
            {"username": "user", "password": "NOT_SPECIFIED"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(models.FacilityUser.objects.all())


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

    def test_return_all_datasets_for_an_admin(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)
        response = self.client.get(reverse("kolibri:core:facilitydataset-list"))
        self.assertEqual(len(response.data), len(models.FacilityDataset.objects.all()))

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
            self.assertDictContainsSubset(mappings[setting], response.data)

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


class MembershipCascadeDeletion(APITestCase):
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

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_delete_classroom_membership(self):
        url = reverse("kolibri:core:membership-list") + "?user={}&collection={}".format(
            self.user.id, self.classroom.id
        )
        response = self.client.delete(url)
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.Membership.objects.filter(user=self.user).exists())

    def test_delete_detail(self):
        response = self.client.delete(
            reverse(
                "kolibri:core:membership-detail",
                kwargs={"pk": self.classroom_membership.id},
            )
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(models.Membership.objects.filter(user=self.user).exists())

    def test_delete_does_not_affect_other_user_memberships(self):
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
        cls.url = reverse("kolibri:core:usernameexists")
        provision_device()

    def test_check_duplicate_username_with_unique_username(self):
        response = self.client.get(
            self.url,
            {"username": "new_user", "facility": self.facility.id},
            format="json",
        )
        expected = {"username_exists": False}
        self.assertDictEqual(response.data, expected)

    def test_check_duplicate_username_with_existing_username(self):
        response = self.client.get(
            self.url,
            {"username": self.user.username, "facility": self.facility.id},
            format="json",
        )
        expected = {"username_exists": True}
        self.assertDictEqual(response.data, expected)

    def test_check_duplicate_username_with_existing_username_other_facility(self):
        other_facility = FacilityFactory.create()
        response = self.client.get(
            self.url,
            {"username": self.user.username, "facility": other_facility.id},
            format="json",
        )
        expected = {"username_exists": False}
        self.assertDictEqual(response.data, expected)
