"""
Tests related specifically to integration with Morango.
"""
import os
import sys
import unittest
import uuid

from django.test import TestCase
from morango.models import InstanceIDModel
from morango.models import Store
from morango.models import syncable_models
from morango.sync.controller import MorangoProfileController

from ..constants.morango_sync import PROFILE_FACILITY_DATA
from ..models import Classroom
from ..models import Facility
from ..models import FacilityDataset
from ..models import FacilityUser
from ..models import LearnerGroup
from ..models import Membership
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
        self.controller = MorangoProfileController(PROFILE_FACILITY_DATA)
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
    """
    Where possible this test case uses the using kwarg with the db alias in order
    to save models to the write DB. Unfortunately, because of an internal issue with
    MPTT, this will sometimes fail for MPTT models.
    TODO: defer this to the server class as an implementation detail.
    """

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

        name = uuid.uuid4().hex
        server.create_model(Classroom, parent_id=fac.id, name=name)
        class_id = Classroom.objects.using(server.db_alias).get(name=name).id
        name = uuid.uuid4().hex
        server.create_model(LearnerGroup, parent_id=class_id, name=name)
        lg_id = LearnerGroup.objects.using(server.db_alias).get(name=name).id
        server.create_model(Membership, user_id=learner.id, collection_id=class_id)
        server.create_model(Membership, user_id=learner.id, collection_id=lg_id)
        server.create_model(Role, collection_id=fac.id, user_id=admin.id, kind="admin")

    def assertServerQuerysetEqual(self, s1, s2, dataset_id):
        models = syncable_models.get_models(PROFILE_FACILITY_DATA)
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
        servers[0].manage(
            "generateuserdata", "--no-onboarding", "--num-content-items", "1"
        )
        servers[1].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )
        servers[2].manage(
            "sync",
            "--baseurl",
            s1_url,
            "--username",
            "superuser",
            "--password",
            "password",
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
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )
        self.assertTrue(
            FacilityUser.objects.using(s1_alias).filter(username="user").exists()
        )

        # missing foreign key lookup should be handled gracefully (https://github.com/learningequality/kolibri/pull/5734)
        user = FacilityUser.objects.using(s1_alias).get(username="user")
        fac = Facility.objects.using(s1_alias).get()
        servers[1].create_model(
            Role, collection_id=fac.id, user_id=user.id, kind="admin"
        )
        servers[0].delete_model(FacilityUser, id=user.id)
        # role object that is synced will try to do FK lookup on deleted user
        servers[0].manage(
            "sync",
            "--baseurl",
            s1_url,
            "--username",
            "superuser",
            "--password",
            "password",
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
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )
        self.assertEqual(
            FacilityUser.objects.using(s0_alias).filter(username="copycat").count(), 2
        )
        self.assertEqual(
            FacilityUser.objects.using(s1_alias).filter(username="copycat").count(), 2
        )

        # Add a classroom
        servers[0].create_model(
            Classroom,
            name="classroom",
            parent_id=Facility.objects.using(s0_alias).first().id,
        )
        servers[1].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )
        self.assertTrue(
            Classroom.objects.using(s1_alias).filter(name="classroom").exists()
        )

        # Add a learnergroup
        servers[0].create_model(
            LearnerGroup,
            name="learnergroup",
            parent_id=Classroom.objects.using(s0_alias).first().id,
        )
        servers[1].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )
        self.assertTrue(
            LearnerGroup.objects.using(s1_alias).filter(name="learnergroup").exists()
        )

        # assert conflicting serialized data is appended after same role is created on different device
        fac = Facility.objects.using(s1_alias).get()
        alk_user = FacilityUser.objects.using(s0_alias).get(username="Antemblowind")
        servers[1].create_model(
            Role, collection_id=fac.id, user_id=alk_user.id, kind="admin"
        )
        servers[0].create_model(
            Role, collection_id=fac.id, user_id=alk_user.id, kind="admin"
        )
        servers[1].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )
        role = Role.objects.using(s1_alias).get(user=alk_user)
        admin_role = Store.objects.using(s1_alias).get(id=role.id)
        self.assertTrue(admin_role.conflicting_serialized_data)

        # assert deleted object is propagated
        servers[0].delete_model(FacilityUser, id=alk_user.id)
        servers[1].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
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
        servers[1].create_model(
            Role, collection_id=fac.id, user_id=alto_user.id, kind="admin"
        )
        role_id = (
            Role.objects.using(s1_alias)
            .get(collection_id=fac.id, user_id=alto_user.id)
            .id
        )
        servers[1].manage(
            "sync",
            "--baseurl",
            s2_url,
            "--username",
            "superuser",
            "--password",
            "password",
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
        servers[2].delete_model(Role, id=role_id)
        servers[1].manage(
            "sync",
            "--baseurl",
            s2_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )
        # create admin role and sync
        servers[1].create_model(
            Role, collection_id=fac.id, user_id=alto_user.id, kind="admin"
        )
        role_id = (
            Role.objects.using(s1_alias).get(collection=fac.id, user=alto_user.id).id
        )
        servers[1].manage(
            "sync",
            "--baseurl",
            s2_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )

        self.assertFalse(Store.objects.using(s2_alias).get(id=role_id).deleted)

        # Change password for a user, check is changed on other device
        server1_fu = FacilityUser.objects.using(s1_alias).get(id=alto_user.id)
        server1_fu.set_password("syncing")
        server1_fu.save(using=s1_alias)
        servers[1].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
        )
        server0_fu = FacilityUser.objects.using(s0_alias).get(id=alto_user.id)
        self.assertTrue(server0_fu.check_password("syncing"))

        # sync in a circle node twice to ensure full consistency
        for i in range(2):
            for j in range(servers_len):
                servers[j].manage(
                    "sync",
                    "--baseurl",
                    servers[(j + 1) % servers_len].baseurl,
                    "--username",
                    "superuser",
                    "--password",
                    "password",
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
        servers[0].manage("generateuserdata", "--no-onboarding")
        for i in range(servers_len - 1):
            servers[i + 1].manage(
                "sync",
                "--baseurl",
                servers[0].baseurl,
                "--username",
                "superuser",
                "--password",
                "password",
            )

        # randomly create objects on two servers and sync with each other
        for i in range(10):
            if (i % 2) == 0:
                self._create_objects(servers[2])
            else:
                self._create_objects(servers[4])

            servers[2].manage(
                "sync",
                "--baseurl",
                servers[4].baseurl,
                "--username",
                "superuser",
                "--password",
                "password",
            )

        # sync in a circle node twice to ensure full consistency
        for i in range(2):
            for j in range(servers_len):
                servers[j].manage(
                    "sync",
                    "--baseurl",
                    servers[(j + 1) % servers_len].baseurl,
                    "--username",
                    "superuser",
                    "--password",
                    "password",
                )

        # assert that the data of specific models match up
        for i in range(servers_len):
            self.assertServerQuerysetEqual(
                servers[i],
                servers[(i + 1) % servers_len],
                FacilityDataset.objects.using(servers[0].db_alias).first().id,
            )
