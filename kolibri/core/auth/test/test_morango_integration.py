"""
Tests related specifically to integration with Morango.
"""
import os
import sys
import unittest
import uuid

import requests
from django.test import TestCase
from morango.models import InstanceIDModel
from morango.models import Store
from morango.models import syncable_models
from morango.sync.controller import MorangoProfileController
from rest_framework import status
from six.moves.urllib.parse import urljoin

from ..models import Classroom
from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from ..models import LearnerGroup
from ..models import Role
from .helpers import DUMMY_PASSWORD
from .sync_utils import multiple_kolibri_servers


class FacilityDatasetCertificateTestCase(TestCase):
    def test_creating_facility_creates_dataset(self):
        facility = Facility.objects.create(name="hallo")
        self.assertIsNotNone(facility.dataset)

    def test_creating_facilitydataset_creates_certificate(self):
        dataset = FacilityDataset.objects.create()
        self.assertIsNotNone(dataset.get_root_certificate())

    def test_partition_and_id_values(self):
        facility = Facility.objects.create(name="hallo")
        dataset_id = facility.dataset.id
        self.assertEqual(dataset_id, facility.dataset.get_root_certificate().id)
        self.assertEqual(dataset_id, facility.dataset._morango_source_id)
        self.assertTrue(facility.dataset._morango_partition.startswith(dataset_id))
        scope = facility.dataset.get_root_certificate().get_scope()
        for partition in scope.read_filter + scope.write_filter:
            self.assertTrue(partition.startswith(dataset_id))


class DateTimeTZFieldTestCase(TestCase):
    def setUp(self):
        self.controller = MorangoProfileController("facilitydata")
        InstanceIDModel.get_or_create_current_instance()

    def test_deserializing_field(self):
        facility = Facility.objects.create(name="hallo")
        FacilityUser.objects.create(username="jamie", facility=facility)
        self.controller.serialize_into_store()
        Store.objects.update(dirty_bit=True)
        try:
            self.controller.deserialize_from_store()
        except AttributeError as e:
            self.fail(e.message)


@unittest.skipIf(sys.platform.startswith("win"), "can't run on Windows")
@unittest.skipIf(
    not os.environ.get("TRAVIS_TAG"), "This test will only be run during tagged builds."
)
class EcosystemTestCase(TestCase):
    def _data(self, *args, **kwargs):
        return kwargs

    def _create_objects(self, server):
        fac = Facility.objects.using(server.db_alias).first()
        admin = FacilityUser(
            username=uuid.uuid4().hex[:30], password=DUMMY_PASSWORD, facility=fac
        )
        admin.save(using=server.db_alias)
        learner = FacilityUser(
            username=uuid.uuid4().hex[:30], password=DUMMY_PASSWORD, facility=fac
        )
        learner.save(using=server.db_alias)
        class_resp = self.request_server(
            server, "classroom", data=self._data(parent=fac.id, name=uuid.uuid4().hex)
        )
        lg_resp = self.request_server(
            server,
            "learnergroup",
            data=self._data(parent=class_resp.json()["id"], name=uuid.uuid4().hex),
        )
        self.request_server(
            server,
            "membership",
            data=self._data(user=learner.id, collection=class_resp.json()["id"]),
        )
        self.request_server(
            server,
            "membership",
            data=self._data(user=learner.id, collection=lg_resp.json()["id"]),
        )
        self.request_server(
            server,
            "role",
            data=self._data(collection=fac.id, user=admin.id, kind="admin"),
        )

    def request_server(
        self, server, endpoint, method="POST", lookup=None, data={}, params={}
    ):
        """

        :param server: kolibri instance we are querying
        :param endpoint: constant representing which kolibri endpoint we are querying
        :param method: HTTP verb/method for request
        :param lookup: the pk value for the specific object we are querying
        :param data: dict that will be form-encoded in request
        :param params: dict to be sent as part of URL's query string
        :return: ``Response`` object from request
        """

        # build up url and send request
        if lookup:
            lookup = lookup + "/"
        url = urljoin(urljoin(server.baseurl, "api/auth/" + endpoint + "/"), lookup)
        auth = ("superuser", "password")
        resp = requests.request(method, url, json=data, params=params, auth=auth)
        resp.raise_for_status()
        return resp

    def assertServerQuerysetEqual(self, s1, s2, dataset_id):
        models = syncable_models.get_models("facilitydata")
        models.pop(
            0
        )  # remove FacilityDataset because __str__() does not point to correct db alias
        for model in models:
            self.assertQuerysetEqual(
                model.objects.using(s1.db_alias).filter(dataset_id=dataset_id),
                [
                    repr(u)
                    for u in model.objects.using(s2.db_alias).filter(
                        dataset_id=dataset_id
                    )
                ],
                ordered=False,
            )
        # morango models
        self.assertQuerysetEqual(
            Store.objects.using(s1.db_alias).filter(partition__startswith=dataset_id),
            [
                repr(u)
                for u in Store.objects.using(s2.db_alias).filter(
                    partition__startswith=dataset_id
                )
            ],
            ordered=False,
        )

    @multiple_kolibri_servers(3)
    def test_scenarios(self, servers):
        servers_len = len(servers)
        self.maxDiff = None
        s0_alias = servers[0].db_alias
        s0_url = servers[0].baseurl
        s1_alias = servers[1].db_alias
        s1_url = servers[1].baseurl
        s2_alias = servers[2].db_alias
        s2_url = servers[2].baseurl
        servers[0].manage("loaddata", "content_test")
        servers[0].manage("generateuserdata", no_onboarding=True, num_content_items=1)
        servers[1].manage(
            "sync", baseurl=s0_url, username="superuser", password="password"
        )
        servers[2].manage(
            "sync", baseurl=s1_url, username="superuser", password="password"
        )

        # assert that all kolibri instances start off equal
        for i in range(servers_len):
            self.assertServerQuerysetEqual(
                servers[i],
                servers[(i + 1) % servers_len],
                FacilityDataset.objects.using(servers[0].db_alias).first().id,
            )

        # assert created user is synced
        FacilityUser(
            username="user",
            password=DUMMY_PASSWORD,
            facility=Facility.objects.using(s0_alias).first(),
        ).save(using=s0_alias)
        servers[1].manage(
            "sync", baseurl=s0_url, username="superuser", password="password"
        )
        self.assertTrue(
            FacilityUser.objects.using(s1_alias).filter(username="user").exists()
        )

        # missing foreign key lookup should be handled gracefully (https://github.com/learningequality/kolibri/pull/5734)
        user = FacilityUser.objects.using(s1_alias).get(username="user")
        fac = Facility.objects.using(s1_alias).get()
        self.request_server(
            servers[1],
            "role",
            data=self._data(collection=fac.id, user=user.id, kind="admin"),
        )
        self.request_server(servers[0], "facilityuser", method="DELETE", lookup=user.id)
        # role object that is synced will try to do FK lookup on deleted user
        servers[0].manage(
            "sync", baseurl=s1_url, username="superuser", password="password"
        )

        # create user with same username on two servers and check they both exist
        FacilityUser(
            username="copycat",
            password=DUMMY_PASSWORD,
            facility=Facility.objects.using(s0_alias).first(),
        ).save(using=s0_alias)
        FacilityUser(
            username="copycat",
            password=DUMMY_PASSWORD,
            facility=Facility.objects.using(s1_alias).first(),
        ).save(using=s1_alias)
        servers[1].manage(
            "sync", baseurl=s0_url, username="superuser", password="password"
        )
        self.assertEqual(
            FacilityUser.objects.using(s0_alias).filter(username="copycat").count(), 2
        )
        self.assertEqual(
            FacilityUser.objects.using(s1_alias).filter(username="copycat").count(), 2
        )

        # Add a classroom
        self.request_server(
            servers[0],
            "classroom",
            data=self._data(
                name="classroom", parent=Facility.objects.using(s0_alias).first().id
            ),
        )
        servers[1].manage(
            "sync", baseurl=s0_url, username="superuser", password="password"
        )
        self.assertTrue(
            Classroom.objects.using(s1_alias).filter(name="classroom").exists()
        )

        # Add a learnergroup
        self.request_server(
            servers[0],
            "learnergroup",
            data=self._data(
                name="learnergroup", parent=Classroom.objects.using(s0_alias).first().id
            ),
        )
        servers[1].manage(
            "sync", baseurl=s0_url, username="superuser", password="password"
        )
        self.assertTrue(
            LearnerGroup.objects.using(s1_alias).filter(name="learnergroup").exists()
        )

        # assert conflicting serialized data is appended after same role is created on different device
        fac = Facility.objects.using(s1_alias).get()
        alk_user = FacilityUser.objects.using(s0_alias).get(username="Antemblowind")
        self.request_server(
            servers[1],
            "role",
            data=self._data(collection=fac.id, user=alk_user.id, kind="admin"),
        )
        self.request_server(
            servers[0],
            "role",
            data=self._data(collection=fac.id, user=alk_user.id, kind="admin"),
        )
        servers[1].manage(
            "sync", baseurl=s0_url, username="superuser", password="password"
        )
        role = Role.objects.using(s1_alias).get(user=alk_user)
        admin_role = Store.objects.using(s1_alias).get(id=role.id)
        self.assertTrue(admin_role.conflicting_serialized_data)

        # assert deleted object is propagated
        self.request_server(
            servers[0], "facilityuser", method="DELETE", lookup=alk_user.id
        )
        servers[1].manage(
            "sync", baseurl=s0_url, username="superuser", password="password"
        )
        self.assertFalse(
            FacilityUser.objects.using(s1_alias)
            .filter(username="Antemblowind")
            .exists()
        )
        self.assertTrue(Store.objects.using(s1_alias).get(id=alk_user.id).deleted)

        # # role deletion and re-creation
        # Change roles for users
        alto_user = FacilityUser.objects.using(s1_alias).get(username="Altobjews1977")
        resp = self.request_server(
            servers[1],
            "role",
            data=self._data(collection=fac.id, user=alto_user.id, kind="admin"),
        )
        servers[1].manage(
            "sync", baseurl=s2_url, username="superuser", password="password"
        )

        self.assertEqual(
            FacilityUser.objects.using(s2_alias)
            .get(username="Altobjews1977")
            .roles.all()
            .first()
            .kind,
            "admin",
        )
        # delete admin role and sync
        self.request_server(
            servers[2], "role", method="DELETE", lookup=resp.json()["id"]
        )
        servers[1].manage(
            "sync", baseurl=s2_url, username="superuser", password="password"
        )
        # create admin role and sync
        resp = self.request_server(
            servers[1],
            "role",
            data=self._data(collection=fac.id, user=alto_user.id, kind="admin"),
        )
        servers[1].manage(
            "sync", baseurl=s2_url, username="superuser", password="password"
        )

        self.assertFalse(
            Store.objects.using(s2_alias).get(id=resp.json()["id"]).deleted
        )

        # Change password for a user, check if you can log in on other device
        self.request_server(
            servers[1],
            "facilityuser",
            method="PATCH",
            lookup=alto_user.id,
            data=self._data(password="syncing"),
        )
        servers[1].manage(
            "sync", baseurl=s0_url, username="superuser", password="password"
        )
        resp = self.request_server(
            servers[0],
            "session",
            data=self._data(
                username=alto_user.username, password="syncing", facility=fac.id
            ),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # sync in a circle node twice to ensure full consistency
        for i in range(2):
            for j in range(servers_len):
                servers[j].manage(
                    "sync",
                    baseurl=servers[(j + 1) % servers_len].baseurl,
                    username="superuser",
                    password="password",
                )

        # assert that the data of specific models match up
        for i in range(servers_len):
            self.assertServerQuerysetEqual(
                servers[i],
                servers[(i + 1) % servers_len],
                FacilityDataset.objects.using(servers[0].db_alias).first().id,
            )

    @multiple_kolibri_servers(5)
    def test_chaos_sync(self, servers):
        servers_len = len(servers)

        # consistent state for all servers
        servers[0].manage("generateuserdata", no_onboarding=True)
        for i in range(servers_len - 1):
            servers[i + 1].manage(
                "sync",
                baseurl=servers[0].baseurl,
                username="superuser",
                password="password",
            )

        # randomly create objects on two servers and sync with each other
        for i in range(10):
            if (i % 2) == 0:
                self._create_objects(servers[2])
            else:
                self._create_objects(servers[4])

            servers[2].manage(
                "sync",
                baseurl=servers[4].baseurl,
                username="superuser",
                password="password",
            )

        # sync in a circle node twice to ensure full consistency
        for i in range(2):
            for j in range(servers_len):
                servers[j].manage(
                    "sync",
                    baseurl=servers[(j + 1) % servers_len].baseurl,
                    username="superuser",
                    password="password",
                )

        # assert that the data of specific models match up
        for i in range(servers_len):
            self.assertServerQuerysetEqual(
                servers[i],
                servers[(i + 1) % servers_len],
                FacilityDataset.objects.using(servers[0].db_alias).first().id,
            )
