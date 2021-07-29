"""
Tests related specifically to integration with Morango.
"""
import os
import unittest
import uuid

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from morango.models import InstanceIDModel
from morango.models import ScopeDefinition
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
from kolibri.core.auth.management.utils import get_client_and_server_certs
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog


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


@unittest.skipIf(
    not os.environ.get("INTEGRATION_TEST"),
    "This test will only be run during integration testing.",
)
class CertificateAuthenticationTestCase(TestCase):
    @multiple_kolibri_servers(1)
    def test_learner_passwordless_authentication(self, servers):
        # START: setup server
        server = servers[0]
        server.manage("loaddata", "scopedefinitions")
        server.manage("loaddata", "content_test")
        server.manage("generateuserdata", "--no-onboarding", "--num-content-items", "1")

        facility = Facility.objects.using(server.db_alias).first()
        facility.dataset.learner_can_login_with_no_password = True
        facility.dataset.learner_can_edit_password = False
        facility.dataset.save(using=server.db_alias)
        learner = FacilityUser(
            username=uuid.uuid4().hex[:30], password=DUMMY_PASSWORD, facility=facility
        )
        learner.save(using=server.db_alias)
        # END: setup server

        # START: local setup
        if not ScopeDefinition.objects.filter():
            call_command("loaddata", "scopedefinitions")

        controller = MorangoProfileController(PROFILE_FACILITY_DATA)
        network_connection = controller.create_network_connection(server.baseurl)

        # if it's not working, this will throw:
        #   requests.exceptions.HTTPError: 401 Client Error: Unauthorized for url
        client_cert, server_cert, username = get_client_and_server_certs(
            learner.username,
            "NOT_THE_DUMMY_PASSWORD",
            facility.dataset_id,
            network_connection,
            user_id=learner.pk,
            facility_id=facility.id,
            noninteractive=True,
        )
        self.assertIsNotNone(client_cert)
        self.assertIsNotNone(server_cert)
        self.assertIsNotNone(username)


@unittest.skipIf(
    not os.environ.get("INTEGRATION_TEST"),
    "This test will only be run during integration testing.",
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


@unittest.skipIf(
    not os.environ.get("INTEGRATION_TEST"),
    "This test will only be run during integration testing.",
)
class EcosystemSingleUserTestCase(TestCase):
    @multiple_kolibri_servers(3)
    def test_single_user_sync(self, servers):
        self.maxDiff = None
        s0_alias = servers[0].db_alias
        s0_url = servers[0].baseurl
        s1_alias = servers[1].db_alias
        s2_alias = servers[2].db_alias
        servers[0].manage("loaddata", "content_test")
        servers[0].manage(
            "generateuserdata", "--no-onboarding", "--num-content-items", "1"
        )

        facility_id = Facility.objects.using(s0_alias).get().id

        learner1 = FacilityUser.objects.using(s0_alias).filter(roles__isnull=True)[0]

        learner2 = FacilityUser.objects.using(s0_alias).filter(roles__isnull=True)[1]

        learner2.set_password("syncing")
        learner2.save(using=s0_alias)

        # Test that we can single user sync with admin creds
        servers[1].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            "superuser",
            "--password",
            "password",
            "--facility",
            facility_id,
            "--user",
            learner1.id,
        )
        # Test that we can single user sync with learner creds
        servers[2].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--username",
            learner2.username,
            "--password",
            "syncing",
            "--facility",
            facility_id,
            "--user",
            learner2.id,
        )

        # Check that learner 1 is on server 1
        self.assertTrue(
            FacilityUser.objects.using(s1_alias).filter(id=learner1.id).exists()
        )
        # Check that learner 2 is not on server 1
        self.assertFalse(
            FacilityUser.objects.using(s1_alias).filter(id=learner2.id).exists()
        )

        # Check that learner 2 is on server 2
        self.assertTrue(
            FacilityUser.objects.using(s2_alias).filter(id=learner2.id).exists()
        )
        # Check that learner 1 is not on server 2
        self.assertFalse(
            FacilityUser.objects.using(s2_alias).filter(id=learner1.id).exists()
        )

        channel_id = "725257a0570044acbd59f8cf6a68b2be"
        content_id = "9f9438fe6b0d42dd8e913d7d04cfb2b2"

        servers[1].create_model(
            ContentSessionLog,
            channel_id=channel_id,
            content_id=content_id,
            user_id=learner1.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        servers[1].create_model(
            ContentSummaryLog,
            channel_id=channel_id,
            content_id=content_id,
            user_id=learner1.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )

        servers[2].create_model(
            ContentSessionLog,
            channel_id=channel_id,
            content_id=content_id,
            user_id=learner2.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        servers[2].create_model(
            ContentSummaryLog,
            channel_id=channel_id,
            content_id=content_id,
            user_id=learner2.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )

        servers[1].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--facility",
            facility_id,
            "--user",
            learner1.id,
        )
        servers[2].manage(
            "sync",
            "--baseurl",
            s0_url,
            "--facility",
            facility_id,
            "--user",
            learner2.id,
        )

        self.assertEqual(
            ContentSessionLog.objects.using(s0_alias)
            .filter(channel_id=channel_id, content_id=content_id)
            .count(),
            2,
        )
        self.assertEqual(
            ContentSummaryLog.objects.using(s0_alias)
            .filter(channel_id=channel_id, content_id=content_id)
            .count(),
            2,
        )


@unittest.skipIf(
    not os.environ.get("INTEGRATION_TEST"),
    "This test will only be run during integration testing.",
)
class EcosystemSingleUserAssignmentTestCase(TestCase):
    @multiple_kolibri_servers(3)
    def test_single_user_assignment_sync(self, servers):
        """
        Testing scenarios that are described in:
        https://github.com/learningequality/kolibri/issues/8079
        """

        self.maxDiff = None
        self.servers = servers
        self.laptop_a = 0
        self.laptop_b = 1
        self.tablet = 2

        self.alias_a = servers[self.laptop_a].db_alias
        self.alias_b = servers[self.laptop_b].db_alias
        self.alias_t = servers[self.tablet].db_alias

        # create the original facility on Laptop A
        servers[self.laptop_a].manage("loaddata", "content_test")
        servers[self.laptop_a].manage(
            "generateuserdata", "--no-onboarding", "--num-content-items", "1"
        )
        self.facility_id = Facility.objects.using(self.alias_a).get().id
        self.learner = FacilityUser.objects.using(self.alias_a).filter(
            roles__isnull=True
        )[0]
        self.teacher = FacilityUser.objects.using(self.alias_a).filter(
            roles__isnull=False
        )[0]
        self.classroom = Classroom.objects.using(self.alias_a).first()
        self.classroom2 = Classroom.objects.using(self.alias_a).all()[1]
        servers[self.laptop_a].create_model(
            Membership, user_id=self.learner.id, collection_id=self.classroom.id
        )

        # repeat the same sets of scenarios, but separately for an exam and a lesson, and with
        # different methods for disabling the assignment as part of the process
        for kind in ("exam", "lesson"):
            for disable_assignment in (self.deactivate, self.unassign):

                # Create on Laptop A, single-user sync to tablet, disable, repeat
                # (making sure it gets both created and removed on the tablet)
                assignment_id = self.create_assignment(kind)
                self.assert_existence(
                    self.laptop_a, kind, assignment_id, should_exist=True
                )
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=False
                )
                self.sync_single_user(self.laptop_a)
                self.assert_existence(
                    self.laptop_a, kind, assignment_id, should_exist=True
                )
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=True
                )
                disable_assignment(self.laptop_a, kind, assignment_id)
                self.assert_existence(
                    self.laptop_a, kind, assignment_id, should_exist=False
                )
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=True
                )
                self.sync_single_user(self.laptop_a)
                self.assert_existence(
                    self.laptop_a, kind, assignment_id, should_exist=False
                )
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=False
                )

                # Create on Laptop A, single-user sync tablet to Laptop A, and then Laptop B
                # (making sure it doesn't get removed when syncing with server that doesn't
                #  know about the assignment yet)
                assignment_id = self.create_assignment(kind)
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=False
                )
                self.sync_single_user(self.laptop_a)
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=True
                )
                self.sync_single_user(self.laptop_b)
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=True
                )

                # Create on Laptop A, do a full sync to Laptop B, single-user sync from there
                # to tablet, then remove on Laptop B, sync that to Laptop A, reverse sync tablet to A
                assignment_id = self.create_assignment(kind)
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=False
                )
                self.assert_existence(
                    self.laptop_b, kind, assignment_id, should_exist=False
                )
                self.sync_full_facility_servers()
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=False
                )
                self.assert_existence(
                    self.laptop_b, kind, assignment_id, should_exist=True
                )
                self.sync_single_user(self.laptop_b)
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=True
                )
                disable_assignment(self.laptop_b, kind, assignment_id)
                self.sync_full_facility_servers()
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=True
                )
                self.sync_single_user(self.laptop_a, tablet_is_client=False)
                self.assert_existence(
                    self.tablet, kind, assignment_id, should_exist=False
                )

        # Create exam on Laptop A, single-user sync to tablet, then modify exam on Laptop A and
        # single-user sync again to check that "updating" works
        assignment_id = self.create_assignment("exam")
        self.sync_single_user(self.laptop_a)
        assignment_a = ExamAssignment.objects.using(self.alias_a).get(id=assignment_id)
        assignment_a.exam.seed = 433
        assignment_a.exam.save()
        self.sync_single_user(self.laptop_a)
        assignment_t = ExamAssignment.objects.using(self.alias_t).get(id=assignment_id)
        assert assignment_t.exam.seed == 433

        # Create lesson on Laptop A, single-user sync to tablet, then modify lesson on Laptop A
        # and single-user sync again to check that "updating" works
        assignment_id = self.create_assignment("lesson")
        self.sync_single_user(self.laptop_a)
        assignment_a = LessonAssignment.objects.using(self.alias_a).get(
            id=assignment_id
        )
        assignment_a.lesson.title = "Bee Boo"
        assignment_a.lesson.save()
        self.sync_single_user(self.laptop_a)
        assignment_t = LessonAssignment.objects.using(self.alias_t).get(
            id=assignment_id
        )
        assert assignment_t.lesson.title == "Bee Boo"

        # The morango dirty bits should not be set on exams, lessons, and assignments on the tablet,
        # since we never want these "ghost" copies to sync back out to anywhere else
        assert (
            ExamAssignment.objects.using(self.alias_t)
            .filter(_morango_dirty_bit=True)
            .count()
            == 0
        )
        assert (
            Exam.objects.using(self.alias_t).filter(_morango_dirty_bit=True).count()
            == 0
        )
        assert (
            LessonAssignment.objects.using(self.alias_t)
            .filter(_morango_dirty_bit=True)
            .count()
            == 0
        )
        assert (
            Lesson.objects.using(self.alias_t).filter(_morango_dirty_bit=True).count()
            == 0
        )

    def sync_full_facility_servers(self):
        """
        Perform a full sync between Laptop A and Laptop B.
        """

        self.servers[self.laptop_b].manage(
            "sync",
            "--baseurl",
            self.servers[self.laptop_a].baseurl,
            "--username",
            "superuser",
            "--password",
            "password",
            "--facility",
            self.facility_id,
        )

    def sync_single_user(self, full_server, tablet_is_client=True):
        """
        Perform a single-user sync from the tablet to one of the full facility servers.
        (Optionally, have it do the sync from the full facility server to the tablet instead.)
        """

        if tablet_is_client:
            self.servers[self.tablet].manage(
                "sync",
                "--baseurl",
                self.servers[full_server].baseurl,
                "--username",
                "superuser",
                "--password",
                "password",
                "--facility",
                self.facility_id,
                "--user",
                self.learner.id,
            )
        else:
            self.servers[full_server].manage(
                "sync",
                "--baseurl",
                self.servers[self.tablet].baseurl,
                "--facility",
                self.facility_id,
                "--user",
                self.learner.id,
            )

    def create_assignment(self, kind):
        """
        Create an exam or lesson and assign it to the class, on a particular server.
        """
        alias = self.servers[self.laptop_a].db_alias
        title = uuid.uuid4().hex
        if kind == "exam":
            self.servers[self.laptop_a].create_model(
                Exam,
                title=title,
                question_count=1,
                question_sources=["a"],
                collection_id=self.classroom.id,
                creator_id=self.teacher.id,
                active=True,
            )
            self.servers[self.laptop_a].create_model(
                ExamAssignment,
                exam_id=Exam.objects.using(alias).get(title=title).id,
                collection_id=self.classroom.id,
                assigned_by_id=self.teacher.id,
            )
            return ExamAssignment.objects.using(alias).get(exam__title=title).id
        elif kind == "lesson":
            self.servers[self.laptop_a].create_model(
                Lesson,
                title=title,
                resources=["a"],
                collection_id=self.classroom.id,
                created_by_id=self.teacher.id,
                is_active=True,
            )
            self.servers[self.laptop_a].create_model(
                LessonAssignment,
                lesson_id=Lesson.objects.using(alias).get(title=title).id,
                collection_id=self.classroom.id,
                assigned_by_id=self.teacher.id,
            )
            return LessonAssignment.objects.using(alias).get(lesson__title=title).id

    def unassign(self, server, kind, assignment_id):
        """
        Remove an exam or lesson assignment from a particular server.
        """
        if kind == "exam":
            self.servers[server].delete_model(ExamAssignment, id=assignment_id)
        elif kind == "lesson":
            self.servers[server].delete_model(LessonAssignment, id=assignment_id)

    def deactivate(self, server, kind, assignment_id):
        """
        Set the active state of a lesson or exam to False on a particular server.
        """
        self.set_active_state(server, kind, assignment_id, False)

    def set_active_state(self, server, kind, assignment_id, state):
        """
        Set the active state of a lesson or exam on a particular server.
        """
        alias = self.servers[server].db_alias
        if kind == "exam":
            assignment = ExamAssignment.objects.using(alias).get(id=assignment_id)
            exam = assignment.exam
            exam.active = state
            exam.save()
        elif kind == "lesson":
            assignment = LessonAssignment.objects.using(alias).get(id=assignment_id)
            lesson = assignment.lesson
            lesson.is_active = state
            lesson.save()

    def assert_existence(self, server, kind, assignment_id, should_exist=True):
        """
        Assert that an exam or lesson is active and assigned to the class on a particular server.
        """
        alias = self.servers[server].db_alias
        try:
            if kind == "exam":
                ExamAssignment.objects.using(alias).get(
                    id=assignment_id, exam__active=True
                )
            elif kind == "lesson":
                LessonAssignment.objects.using(alias).get(
                    id=assignment_id, lesson__is_active=True
                )
            assert (
                should_exist
            ), "Assignment {assignment_id} should not exist on server {server} but does!".format(
                assignment_id=assignment_id, server=server
            )
        except (ExamAssignment.DoesNotExist, LessonAssignment.DoesNotExist):
            assert (
                not should_exist
            ), "Assignment {assignment_id} should exist on server {server}!".format(
                assignment_id=assignment_id, server=server
            )
