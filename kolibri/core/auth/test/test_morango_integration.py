"""
Tests related specifically to integration with Morango.
"""
import datetime
import os
import unittest
import uuid

import requests
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from le_utils.constants import content_kinds
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
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.public.utils import find_soud_sync_session_for_resume


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
    def test_multi_facility_authentication(self, servers):
        """
        Multiple facilities with a superuser of the same username on each to verify that cert
        generation properly passes along the facility for authenticating the user with the correct
        facility
        """
        # START: setup server
        server = servers[0]
        server.manage("loaddata", "scopedefinitions")
        server.manage("loaddata", "content_test")
        server.manage(
            "generateuserdata",
            "--no-onboarding",
            "--num-content-items",
            "1",
            "--facilities",
            "2",
        )

        facility_1 = Facility.objects.using(server.db_alias).first()
        facility_2 = Facility.objects.using(server.db_alias).last()
        self.assertNotEqual(facility_1.id, facility_2.id)

        superuser_1 = FacilityUser.objects.using(server.db_alias).get(
            username="superuser", facility=facility_1
        )
        superuser_2 = FacilityUser.objects.using(server.db_alias).get(
            username="superuser", facility=facility_2
        )
        self.assertNotEqual(superuser_1.id, superuser_2.id)

        superuser_1.set_password("superuser_1")
        superuser_1.save(using=server.db_alias)
        superuser_2.set_password("superuser_2")
        superuser_2.save(using=server.db_alias)
        # END: setup server

        # START: local setup
        if not ScopeDefinition.objects.filter():
            call_command("loaddata", "scopedefinitions")

        controller = MorangoProfileController(PROFILE_FACILITY_DATA)
        network_connection = controller.create_network_connection(server.baseurl)

        # facility mismatch for superuser 1
        with self.assertRaises(requests.exceptions.HTTPError):
            get_client_and_server_certs(
                superuser_1.username,
                "superuser_1",
                facility_1.dataset_id,
                network_connection,
                facility_id=facility_2.id,
                noninteractive=True,
            )
        # facility mismatch for superuser 2
        with self.assertRaises(requests.exceptions.HTTPError):
            get_client_and_server_certs(
                superuser_2.username,
                "superuser_2",
                facility_2.dataset_id,
                network_connection,
                facility_id=facility_1.id,
                noninteractive=True,
            )

        client_cert, server_cert, username = get_client_and_server_certs(
            superuser_1.username,
            "superuser_1",
            facility_1.dataset_id,
            network_connection,
            facility_id=facility_1.id,
            noninteractive=True,
        )
        self.assertIsNotNone(client_cert)
        self.assertIsNotNone(server_cert)
        self.assertIsNotNone(username)

        client_cert, server_cert, username = get_client_and_server_certs(
            superuser_2.username,
            "superuser_2",
            facility_2.dataset_id,
            network_connection,
            facility_id=facility_2.id,
            noninteractive=True,
        )
        self.assertIsNotNone(client_cert)
        self.assertIsNotNone(server_cert)
        self.assertIsNotNone(username)

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
        admin_username = uuid.uuid4().hex[:30]
        learner_username = uuid.uuid4().hex[:30]
        server.create_model(
            FacilityUser,
            username=admin_username,
            password=DUMMY_PASSWORD,
            facility_id=fac.id,
        )
        server.create_model(
            FacilityUser,
            username=learner_username,
            password=DUMMY_PASSWORD,
            facility_id=fac.id,
        )
        admin = FacilityUser.objects.using(server.db_alias).get(username=admin_username)
        learner = FacilityUser.objects.using(server.db_alias).get(
            username=learner_username
        )

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

    @multiple_kolibri_servers(
        3,
        env=[
            None,
            {
                "MORANGO_INSTANCE_INFO": "kolibri.core.auth.test.sync_utils:CUSTOM_INSTANCE_INFO"
            },
            None,
        ],
    )
    def test_scenarios(self, servers):
        servers_len = len(servers)
        self.maxDiff = None
        s0, s1, s2 = servers
        facility, _, _ = s0.generate_base_data()

        s1.sync(s0, facility)
        s2.sync(s1, facility)

        # assert that all kolibri instances start off equal
        for i in range(servers_len):
            self.assertServerQuerysetEqual(
                servers[i],
                servers[(i + 1) % servers_len],
                facility.dataset_id,
            )

        # assert created user is synced
        s0.create_model(
            FacilityUser,
            username="user",
            password=DUMMY_PASSWORD,
            facility_id=facility.id,
        )
        s1.sync(s0, facility)
        self.assertTrue(
            FacilityUser.objects.using(s1.db_alias).filter(username="user").exists()
        )

        # missing foreign key lookup should be handled gracefully (https://github.com/learningequality/kolibri/pull/5734)
        user = FacilityUser.objects.using(s1.db_alias).get(username="user")
        fac = Facility.objects.using(s1.db_alias).get()
        s1.create_model(Role, collection_id=fac.id, user_id=user.id, kind="admin")
        s0.delete_model(FacilityUser, id=user.id)
        # role object that is synced will try to do FK lookup on deleted user
        s0.sync(s1, facility)

        # create user with same username on two servers and check they both exist
        s0.create_model(
            FacilityUser,
            username="copycat",
            password=DUMMY_PASSWORD,
            facility_id=facility.id,
        )
        s1.create_model(
            FacilityUser,
            username="copycat",
            password=DUMMY_PASSWORD,
            facility_id=facility.id,
        )
        s1.sync(s0, facility)
        self.assertEqual(
            FacilityUser.objects.using(s0.db_alias).filter(username="copycat").count(),
            2,
        )
        self.assertEqual(
            FacilityUser.objects.using(s1.db_alias).filter(username="copycat").count(),
            2,
        )

        # Add a classroom
        s0.create_model(
            Classroom,
            name="classroom",
            parent_id=Facility.objects.using(s0.db_alias).first().id,
        )
        s1.sync(s0, facility)
        self.assertTrue(
            Classroom.objects.using(s1.db_alias).filter(name="classroom").exists()
        )

        # Add a learnergroup
        s0.create_model(
            LearnerGroup,
            name="learnergroup",
            parent_id=Classroom.objects.using(s0.db_alias).first().id,
        )
        s1.sync(s0, facility)
        self.assertTrue(
            LearnerGroup.objects.using(s1.db_alias).filter(name="learnergroup").exists()
        )

        # assert conflicting serialized data is appended after same role is created on different device
        fac = Facility.objects.using(s1.db_alias).get()
        alk_user = FacilityUser.objects.using(s0.db_alias).get(username="Antemblowind")
        s1.create_model(Role, collection_id=fac.id, user_id=alk_user.id, kind="admin")
        s0.create_model(Role, collection_id=fac.id, user_id=alk_user.id, kind="admin")
        s1.sync(s0, facility)
        role = Role.objects.using(s1.db_alias).get(user=alk_user)
        admin_role = Store.objects.using(s1.db_alias).get(id=role.id)
        self.assertTrue(admin_role.conflicting_serialized_data)

        # assert deleted object is propagated
        s0.delete_model(FacilityUser, id=alk_user.id)
        s1.sync(s0, facility)
        self.assertFalse(
            FacilityUser.objects.using(s1.db_alias)
            .filter(username="Antemblowind")
            .exists()
        )
        self.assertTrue(Store.objects.using(s1.db_alias).get(id=alk_user.id).deleted)

        # # role deletion and re-creation
        # Change roles for users
        alto_user = FacilityUser.objects.using(s1.db_alias).get(
            username="Altobjews1977"
        )
        s1.create_model(Role, collection_id=fac.id, user_id=alto_user.id, kind="admin")
        role_id = (
            Role.objects.using(s1.db_alias)
            .get(collection_id=fac.id, user_id=alto_user.id)
            .id
        )
        s1.sync(s2, facility)

        self.assertEqual(
            FacilityUser.objects.using(s2.db_alias)
            .get(username="Altobjews1977")
            .roles.all()
            .first()
            .kind,
            "admin",
        )
        # delete admin role and sync
        s2.delete_model(Role, id=role_id)
        s1.sync(s2, facility)
        # create admin role and sync
        s1.create_model(Role, collection_id=fac.id, user_id=alto_user.id, kind="admin")
        role_id = (
            Role.objects.using(s1.db_alias).get(collection=fac.id, user=alto_user.id).id
        )
        s1.sync(s2, facility)

        self.assertFalse(Store.objects.using(s2.db_alias).get(id=role_id).deleted)

        # Change password for a user, check is changed on other device
        s1.change_password(alto_user.id, "syncing")
        s1.sync(s0, facility)
        server0_fu = FacilityUser.objects.using(s0.db_alias).get(id=alto_user.id)
        self.assertTrue(server0_fu.check_password("syncing"))

        # sync in a circle node twice to ensure full consistency
        for i in range(2):
            for j in range(servers_len):
                servers[j].sync(servers[(j + 1) % servers_len], facility)

        # assert that the data of specific models match up
        for i in range(servers_len):
            self.assertServerQuerysetEqual(
                servers[i],
                servers[(i + 1) % servers_len],
                facility.dataset_id,
            )

        # Test migration of ExamLog and ExamAttemptLog from s1 to s2 to verify receipt which
        # requires spoofing kolibri version in syncing info
        exam_title = uuid.uuid4().hex
        classroom_id = Classroom.objects.using(s1.db_alias).get(name="classroom").id
        s2.create_model(
            FacilityUser,
            username="learner",
            password=DUMMY_PASSWORD,
            facility_id=facility.id,
        )
        learner_id = FacilityUser.objects.using(s2.db_alias).get(username="learner").id
        s2.create_model(
            Exam,
            title=exam_title,
            question_count=1,
            question_sources=["a"],
            collection_id=classroom_id,
            creator_id=alto_user.id,
            active=True,
        )
        exam_id = Exam.objects.using(s2.db_alias).get(title=exam_title).id
        s2.create_model(
            ExamAssignment,
            exam_id=exam_id,
            collection_id=classroom_id,
            assigned_by_id=alto_user.id,
        )

        s1.sync(s2, facility)

        s1.create_model(
            ExamLog,
            exam_id=exam_id,
            user_id=learner_id,
            completion_timestamp=timezone.now(),
        )
        exam_log = ExamLog.objects.using(s1.db_alias).get(
            exam_id=exam_id, user_id=learner_id
        )
        s1.create_model(
            ExamAttemptLog,
            user_id=learner_id,
            examlog_id=exam_log.id,
            content_id=exam_id,
            item=uuid.uuid4().hex,
            start_timestamp=timezone.now(),
            end_timestamp=timezone.now(),
            completion_timestamp=timezone.now(),
            time_spent=2,
            complete=True,
            correct=False,
        )

        s1.sync(s2, facility)

        self.assertTrue(
            MasteryLog.objects.using(s2.db_alias)
            .filter(user_id=learner_id, summarylog__content_id=exam_id)
            .exists()
        )

    @multiple_kolibri_servers(5)
    def test_chaos_sync(self, servers):
        servers_len = len(servers)

        # consistent state for all servers
        servers[0].manage("generateuserdata", "--no-onboarding")
        facility = Facility.objects.using(servers[0].db_alias).get()
        for i in range(servers_len - 1):
            servers[i + 1].sync(servers[0], facility)

        # randomly create objects on two servers and sync with each other
        for i in range(10):
            if (i % 2) == 0:
                self._create_objects(servers[2])
            else:
                self._create_objects(servers[4])

            servers[2].sync(servers[4], facility)

        # sync in a circle node twice to ensure full consistency
        for i in range(2):
            for j in range(servers_len):
                servers[j].sync(servers[(j + 1) % servers_len], facility)

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
        s0, s1, s2 = servers

        facility, _, _ = s0.generate_base_data()

        learner1 = FacilityUser.objects.using(s0.db_alias).filter(
            roles__isnull=True, devicepermissions=None
        )[0]
        learner2 = FacilityUser.objects.using(s0.db_alias).filter(
            roles__isnull=True, devicepermissions=None
        )[1]
        s0.change_password(learner2, "syncing")

        # Test that we can single user sync with admin creds
        s1.sync(s0, facility, user=learner1)
        # Test that we can single user sync with learner creds
        s2.sync(
            s0, facility, user=learner2, username=learner2.username, password="syncing"
        )

        # Check that learner 1 is on server 1
        self.assertTrue(
            FacilityUser.objects.using(s1.db_alias).filter(id=learner1.id).exists()
        )
        # Check that learner 2 is not on server 1
        self.assertFalse(
            FacilityUser.objects.using(s1.db_alias).filter(id=learner2.id).exists()
        )

        # Check that learner 2 is on server 2
        self.assertTrue(
            FacilityUser.objects.using(s2.db_alias).filter(id=learner2.id).exists()
        )
        # Check that learner 1 is not on server 2
        self.assertFalse(
            FacilityUser.objects.using(s2.db_alias).filter(id=learner1.id).exists()
        )

        channel_id = "725257a0570044acbd59f8cf6a68b2be"
        content_id = "9f9438fe6b0d42dd8e913d7d04cfb2b2"

        s1.create_model(
            ContentSessionLog,
            channel_id=channel_id,
            content_id=content_id,
            user_id=learner1.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        s1.create_model(
            ContentSummaryLog,
            channel_id=channel_id,
            content_id=content_id,
            user_id=learner1.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )

        s2.create_model(
            ContentSessionLog,
            channel_id=channel_id,
            content_id=content_id,
            user_id=learner2.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )
        s2.create_model(
            ContentSummaryLog,
            channel_id=channel_id,
            content_id=content_id,
            user_id=learner2.id,
            start_timestamp=timezone.now(),
            kind="audio",
        )

        s1.sync(s0, facility, user=learner1)
        s2.sync(s0, facility, user=learner2)

        self.assertEqual(
            ContentSessionLog.objects.using(s0.db_alias)
            .filter(channel_id=channel_id, content_id=content_id)
            .count(),
            2,
        )
        self.assertEqual(
            ContentSummaryLog.objects.using(s0.db_alias)
            .filter(channel_id=channel_id, content_id=content_id)
            .count(),
            2,
        )

    @multiple_kolibri_servers(2)
    def test_single_user_sync_resumption(self, servers):
        self.maxDiff = None
        s0_alias = servers[0].db_alias
        s0_url = servers[0].baseurl
        s1_alias = servers[1].db_alias
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
            "--keep-alive",
        )

        # Check that learner 1 is on server 1
        self.assertTrue(
            FacilityUser.objects.using(s1_alias).filter(id=learner1.id).exists()
        )
        # Check that learner 2 is not on server 1
        self.assertFalse(
            FacilityUser.objects.using(s1_alias).filter(id=learner2.id).exists()
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

        sync_session = find_soud_sync_session_for_resume(
            learner1, s0_url, using=s1_alias
        )
        self.assertIsNotNone(sync_session)

        servers[1].manage(
            "resumesync",
            "--id",
            sync_session.id,
            "--baseurl",
            s0_url,
            "--user",
            learner1.id,
            "--keep-alive",
        )

        self.assertEqual(
            ContentSessionLog.objects.using(s0_alias)
            .filter(channel_id=channel_id, content_id=content_id)
            .count(),
            1,
        )
        self.assertEqual(
            ContentSummaryLog.objects.using(s0_alias)
            .filter(channel_id=channel_id, content_id=content_id)
            .count(),
            1,
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
        self.laptop_a, self.laptop_b, self.tablet = servers

        self.facility, self.learner, self.teacher = self.laptop_a.generate_base_data()

        self.classroom = Classroom.objects.using(self.laptop_a.db_alias).first()
        self.classroom2 = Classroom.objects.using(self.laptop_a.db_alias).all()[1]

        self.laptop_a.create_model(
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
        assignment_a = ExamAssignment.objects.using(self.laptop_a.db_alias).get(
            id=assignment_id
        )
        assignment_a.exam.seed = 433
        assignment_a.exam.save()
        self.sync_single_user(self.laptop_a)
        assignment_t = ExamAssignment.objects.using(self.tablet.db_alias).get(
            id=assignment_id
        )
        assert assignment_t.exam.seed == 433

        # Create Exam related logs on tablet and sync to laptop A to verify receipt
        exam_start = timezone.now() - datetime.timedelta(minutes=42)
        exam_end = timezone.now()
        self.tablet.create_model(
            ContentSessionLog,
            user_id=self.learner.id,
            content_id=assignment_t.exam_id,
            start_timestamp=exam_start,
            end_timestamp=exam_end,
            progress=1,
            kind=content_kinds.QUIZ,
        )
        exam_session_log = ContentSessionLog.objects.using(self.tablet.db_alias).get(
            content_id=assignment_t.exam_id, user_id=self.learner.id
        )
        self.tablet.create_model(
            ContentSummaryLog,
            user_id=self.learner.id,
            content_id=assignment_t.exam_id,
            start_timestamp=exam_start,
            end_timestamp=exam_end,
            completion_timestamp=exam_end,
            progress=1,
            kind=content_kinds.QUIZ,
        )
        exam_summary_log = ContentSummaryLog.objects.using(self.tablet.db_alias).get(
            content_id=assignment_t.exam_id, user_id=self.learner.id
        )
        self.tablet.create_model(
            MasteryLog,
            user_id=self.learner.id,
            summarylog_id=exam_summary_log.id,
            mastery_criterion={"type": content_kinds.QUIZ},
            start_timestamp=exam_start,
            end_timestamp=exam_end,
            completion_timestamp=exam_end,
            mastery_level=1,
            complete=True,
        )
        exam_mastery_log = MasteryLog.objects.using(self.tablet.db_alias).get(
            summarylog_id=exam_summary_log.id, user_id=self.learner.id
        )
        self.tablet.create_model(
            AttemptLog,
            user_id=self.learner.id,
            sessionlog_id=exam_session_log.id,
            masterylog_id=exam_mastery_log.id,
            item=uuid.uuid4().hex,
            start_timestamp=exam_start,
            end_timestamp=exam_end,
            completion_timestamp=exam_end,
            time_spent=2,
            complete=True,
            correct=1,
        )
        self.sync_single_user(self.laptop_a)
        logs_expected = [
            ContentSessionLog.objects.filter(
                content_id=assignment_t.exam_id, user_id=self.learner.id
            ),
            ContentSummaryLog.objects.filter(
                content_id=assignment_t.exam_id, user_id=self.learner.id
            ),
            MasteryLog.objects.filter(
                summarylog_id=exam_summary_log.id, user_id=self.learner.id
            ),
            AttemptLog.objects.filter(
                sessionlog_id=exam_session_log.id, masterylog_id=exam_mastery_log.id
            ),
        ]

        for log_queryset in logs_expected:
            self.assertTrue(
                log_queryset.using(self.laptop_a.db_alias).exists(),
                msg="Exam logging information in {} was not synced".format(
                    log_queryset.model.__name__
                ),
            )

        # Create lesson on Laptop A, single-user sync to tablet, then modify lesson on Laptop A
        # and single-user sync again to check that "updating" works
        assignment_id = self.create_assignment("lesson")
        self.sync_single_user(self.laptop_a)
        assignment_a = LessonAssignment.objects.using(self.laptop_a.db_alias).get(
            id=assignment_id
        )
        assignment_a.lesson.title = "Bee Boo"
        assignment_a.lesson.save()
        self.sync_single_user(self.laptop_a)
        assignment_t = LessonAssignment.objects.using(self.tablet.db_alias).get(
            id=assignment_id
        )
        assert assignment_t.lesson.title == "Bee Boo"

        # The morango dirty bits should not be set on exams, lessons, and assignments on the tablet,
        # since we never want these "ghost" copies to sync back out to anywhere else
        assert (
            ExamAssignment.objects.using(self.tablet.db_alias)
            .filter(_morango_dirty_bit=True)
            .count()
            == 0
        )
        assert (
            Exam.objects.using(self.tablet.db_alias)
            .filter(_morango_dirty_bit=True)
            .count()
            == 0
        )
        assert (
            LessonAssignment.objects.using(self.tablet.db_alias)
            .filter(_morango_dirty_bit=True)
            .count()
            == 0
        )
        assert (
            Lesson.objects.using(self.tablet.db_alias)
            .filter(_morango_dirty_bit=True)
            .count()
            == 0
        )

    def sync_full_facility_servers(self):
        """
        Perform a full sync between Laptop A and Laptop B.
        """

        self.laptop_b.sync(
            self.laptop_a,
            self.facility,
        )

    def sync_single_user(self, full_server, tablet_is_client=True):
        """
        Perform a single-user sync from the tablet to one of the full facility servers.
        (Optionally, have it do the sync from the full facility server to the tablet instead.)
        """

        if tablet_is_client:
            self.tablet.sync(
                full_server,
                self.facility,
                user=self.learner,
            )
        else:
            full_server.sync(
                self.tablet,
                self.facility,
                user=self.learner,
            )

    def create_assignment(self, kind):
        """
        Create an exam or lesson and assign it to the class, on a particular server.
        """
        alias = self.laptop_a.db_alias
        title = uuid.uuid4().hex
        if kind == "exam":
            self.laptop_a.create_model(
                Exam,
                title=title,
                question_count=1,
                question_sources=["a"],
                collection_id=self.classroom.id,
                creator_id=self.teacher.id,
                active=True,
            )
            self.laptop_a.create_model(
                ExamAssignment,
                exam_id=Exam.objects.using(alias).get(title=title).id,
                collection_id=self.classroom.id,
                assigned_by_id=self.teacher.id,
            )
            return ExamAssignment.objects.using(alias).get(exam__title=title).id
        elif kind == "lesson":
            self.laptop_a.create_model(
                Lesson,
                title=title,
                resources=["a"],
                collection_id=self.classroom.id,
                created_by_id=self.teacher.id,
                is_active=True,
            )
            self.laptop_a.create_model(
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
            server.delete_model(ExamAssignment, id=assignment_id)
        elif kind == "lesson":
            server.delete_model(LessonAssignment, id=assignment_id)

    def deactivate(self, server, kind, assignment_id):
        """
        Set the active state of a lesson or exam to False on a particular server.
        """
        self.set_active_state(server, kind, assignment_id, False)

    def set_active_state(self, server, kind, assignment_id, state):
        """
        Set the active state of a lesson or exam on a particular server.
        """
        alias = server.db_alias
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
        alias = server.db_alias
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


@unittest.skipIf(
    not os.environ.get("INTEGRATION_TEST"),
    "This test will only be run during integration testing.",
)
class SingleUserSyncRegressionsTestCase(TestCase):
    @multiple_kolibri_servers(2)
    def test_facility_user_conflict_syncing_from_tablet(self, servers):
        self._test_facility_user_conflict(servers, True)

    @multiple_kolibri_servers(2)
    def test_facility_user_conflict_syncing_from_laptop(self, servers):
        self._test_facility_user_conflict(servers, False)

    def _test_facility_user_conflict(self, servers, tablet_is_client):
        """
        This is a regression test to handle the case of a FacilityUser being changed
        on a SoUD as a backend side effect, e.g. by Django updating the `last_login`
        field, leading to a merge conflict when the user is updated on another device.
        """

        laptop, tablet = servers

        facility, learner, _ = laptop.generate_base_data()

        tablet.sync(laptop, facility, user=learner)

        laptop.update_model(FacilityUser, learner.id, full_name="NEW")

        tablet.update_model(
            FacilityUser, learner.id, last_login=datetime.datetime.now()
        )

        if tablet_is_client:
            tablet.sync(laptop, facility, user=learner)
        else:
            laptop.sync(tablet, facility, user=learner)

        assert (
            FacilityUser.objects.using(tablet.db_alias).get(id=learner.id).full_name
            == "NEW"
        )

    @multiple_kolibri_servers(3)
    def test_kolibri_issue_8439(self, servers):
        """
        This is to test the syncing issue identified in:
        https://github.com/learningequality/kolibri/issues/8439
        and should pass once Morango 0.6.6 is released.
        """

        mainserver, soud1, soud2 = servers

        facility, learner, _ = mainserver.generate_base_data()

        # set up soud1 as a single-user device
        soud1.sync(mainserver, facility, user=learner)

        # create a log on soud1
        base_log_params = {
            "channel_id": "725257a0570044acbd59f8cf6a68b2be",
            "content_id": "9f9438fe6b0d42dd8e913d7d04cfb277",
            "user_id": learner.id,
        }
        soud1.create_model(
            ContentSummaryLog,
            start_timestamp=timezone.now(),
            kind="audio",
            **base_log_params
        )

        # sync the log from soud1 back to the main server
        soud1.sync(mainserver, facility, user=learner)

        # verify that it was synced correctly
        assert (
            ContentSummaryLog.objects.using(mainserver.db_alias)
            .filter(**base_log_params)
            .exists()
        )

        # sync the same user and their data onto a new single-user device
        soud2.sync(mainserver, facility, user=learner)

        # verify that the log has made it over to the new single-user device as well
        assert (
            ContentSummaryLog.objects.using(soud2.db_alias)
            .filter(**base_log_params)
            .exists()
        )
