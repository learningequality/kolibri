from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import datetime
import random
import uuid

import factory
import mock
from django.core.management.base import CommandError
from django.test import TestCase
from morango.registry import syncable_models

from ..models import Facility
from kolibri.core.auth.management import utils
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.test_api import ClassroomFactory
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.auth.test.test_api import LearnerGroupFactory
from kolibri.core.auth.utils.delete import get_delete_group_for_facility
from kolibri.core.auth.utils.migrate import fork_facility
from kolibri.core.auth.utils.migrate import merge_users
from kolibri.core.logger import models as log_models


class GetFacilityTestCase(TestCase):
    """
    Tests getting facility or by ID.
    """

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="facility")

    def test_get_facility_with_id(self):
        self.assertEqual(
            self.facility, utils.get_facility(facility_id=self.facility.id)
        )

    def test_get_facility_with_non_existent_id(self):
        with self.assertRaisesRegexp(CommandError, "does not exist"):
            utils.get_facility(facility_id=uuid.uuid4().hex)

    def test_get_facility_with_no_id(self):
        self.assertEqual(self.facility, utils.get_facility())

    def test_get_facility_multiple_facilities_noninteractive(self):
        Facility.objects.create(name="facility2")
        with self.assertRaisesRegexp(CommandError, "multiple facilities"):
            utils.get_facility(noninteractive=True)

    @mock.patch("kolibri.core.auth.management.utils.input", return_value="3")
    def test_get_facility_multiple_facilities_interactive(self, input_mock):
        # Desired facility should be third item
        Facility.objects.create(name="a_facility")
        Facility.objects.create(name="b_facility")
        self.assertEqual(self.facility, utils.get_facility())


class GetFacilityFailureTestCase(TestCase):
    def test_get_facility_no_facilities(self):
        with self.assertRaisesRegexp(CommandError, "no facilities"):
            utils.get_facility()


class ContentSessionLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = log_models.ContentSessionLog

    user = factory.SubFactory(FacilityUserFactory)
    start_timestamp = datetime.datetime.now()
    content_id = factory.LazyFunction(lambda: uuid.uuid4().hex)
    channel_id = factory.LazyFunction(lambda: uuid.uuid4().hex)
    progress = factory.LazyFunction(random.random)


class ContentSummaryLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = log_models.ContentSummaryLog

    user = factory.SubFactory(FacilityUserFactory)
    start_timestamp = datetime.datetime.now()
    content_id = factory.LazyFunction(lambda: uuid.uuid4().hex)
    channel_id = factory.LazyFunction(lambda: uuid.uuid4().hex)
    progress = factory.LazyFunction(random.random)


class UserSessionLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = log_models.UserSessionLog

    user = factory.SubFactory(FacilityUserFactory)


class MasteryLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = log_models.MasteryLog

    user = factory.SubFactory(FacilityUserFactory)
    summarylog = factory.SubFactory(ContentSummaryLogFactory)
    start_timestamp = datetime.datetime.now()
    mastery_level = factory.LazyFunction(lambda: random.randint(1, 10))


class AttemptLogFactory(factory.DjangoModelFactory):
    class Meta:
        model = log_models.AttemptLog

    user = factory.SubFactory(FacilityUserFactory)
    masterylog = factory.SubFactory(MasteryLogFactory)
    sessionlog = factory.SubFactory(ContentSessionLogFactory)
    start_timestamp = datetime.datetime.now()
    end_timestamp = datetime.datetime.now()
    correct = False
    time_spent = factory.LazyFunction(random.random)


class TeleportUserTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        user = FacilityUserFactory.create(facility=cls.facility)

        sess_logs = []
        summ_logs = []

        for _ in range(3):
            sess_logs.append(
                ContentSessionLogFactory.create(
                    user=user,
                )
            )

            summ_logs.append(
                ContentSummaryLogFactory.create(
                    user=user,
                )
            )
        ex_csessl = ContentSessionLogFactory.create(
            user=user,
        )

        ex_csmlog = ContentSummaryLogFactory.create(
            user=user,
        )
        masterylog = MasteryLogFactory.create(user=user, summarylog=ex_csmlog)
        attemptlog = AttemptLogFactory.create(
            user=user, masterylog=masterylog, sessionlog=ex_csessl
        )
        usersessionlog = UserSessionLogFactory.create(user=user)

        sess_logs.append(ex_csessl)
        summ_logs.append(ex_csmlog)

        setattr(cls, "user_1", user)
        setattr(cls, "user_1_sess_logs", sess_logs)
        setattr(cls, "user_1_summ_logs", summ_logs)
        setattr(cls, "user_1_masterylog", masterylog)
        setattr(cls, "user_1_attemptlog", attemptlog)
        setattr(cls, "user_1_usersessionlog", usersessionlog)

        cls.user_1_id = cls.user_1.id

        cls.user_2 = FacilityUserFactory.create(facility=cls.facility)

        merge_users(cls.user_1, cls.user_2)

    def test_masterylogs(self):
        self.assertEqual(
            log_models.MasteryLog.objects.filter(user=self.user_2).count(), 1
        )
        log = self.user_1_masterylog
        self.assertTrue(
            log_models.MasteryLog.objects.filter(
                summarylog__progress=log.summarylog.progress,
                user=self.user_2,
                mastery_level=log.mastery_level,
                summarylog__channel_id=log.summarylog.channel_id,
                summarylog__content_id=log.summarylog.content_id,
            ).exists()
        )

    def test_usersessionlogs(self):
        self.assertEqual(
            log_models.UserSessionLog.objects.filter(user=self.user_2).count(), 1
        )

    def test_attemptlogs(self):
        self.assertEqual(
            log_models.AttemptLog.objects.filter(user=self.user_2).count(), 1
        )
        log = self.user_1_attemptlog
        self.assertTrue(
            log_models.AttemptLog.objects.filter(
                masterylog__summarylog__progress=log.masterylog.summarylog.progress,
                user=self.user_2,
                time_spent=log.time_spent,
                masterylog__summarylog__channel_id=log.masterylog.summarylog.channel_id,
                masterylog__summarylog__content_id=log.masterylog.summarylog.content_id,
            ).exists()
        )
        for attempt_log in log_models.AttemptLog.objects.filter(user=self.user_2):
            for json_field in ("answer", "interaction_history"):
                self.assertNotIsInstance(getattr(attempt_log, json_field), (str,))

    def test_contentsessionlogs(self):
        self.assertEqual(
            log_models.ContentSessionLog.objects.filter(user=self.user_2).count(),
            len(self.user_1_sess_logs),
        )
        for log in self.user_1_sess_logs:
            self.assertTrue(
                log_models.ContentSessionLog.objects.filter(
                    progress=log.progress,
                    user=self.user_2,
                    content_id=log.content_id,
                    channel_id=log.channel_id,
                ).exists()
            )

    def test_contentsummarylogs(self):
        self.assertEqual(
            log_models.ContentSummaryLog.objects.filter(user=self.user_2).count(),
            len(self.user_1_summ_logs),
        )
        for log in self.user_1_summ_logs:
            self.assertTrue(
                log_models.ContentSummaryLog.objects.filter(
                    progress=log.progress,
                    user=self.user_2,
                    content_id=log.content_id,
                    channel_id=log.channel_id,
                ).exists()
            )


class TeleportUserTwiceTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        i = 1
        user = FacilityUserFactory.create(facility=cls.facility)

        sess_logs = []
        summ_logs = []

        for _ in range(3):
            sess_logs.append(
                ContentSessionLogFactory.create(
                    user=user,
                )
            )

            summ_logs.append(
                ContentSummaryLogFactory.create(
                    user=user,
                )
            )
        ex_csessl = ContentSessionLogFactory.create(
            user=user,
        )

        ex_csmlog = ContentSummaryLogFactory.create(
            user=user,
        )
        masterylog = MasteryLogFactory.create(user=user, summarylog=ex_csmlog)
        attemptlog = AttemptLogFactory.create(
            user=user, masterylog=masterylog, sessionlog=ex_csessl
        )
        usersessionlog = UserSessionLogFactory.create(user=user)

        sess_logs.append(ex_csessl)
        summ_logs.append(ex_csmlog)

        setattr(cls, "user_{}".format(str(i)), user)
        setattr(cls, "user_{}_sess_logs".format(str(i)), sess_logs)
        setattr(cls, "user_{}_summ_logs".format(str(i)), summ_logs)
        setattr(cls, "user_{}_masterylog".format(str(i)), masterylog)
        setattr(cls, "user_{}_attemptlog".format(str(i)), attemptlog)
        setattr(cls, "user_{}_usersessionlog".format(str(i)), usersessionlog)

        cls.user_1_id = cls.user_1.id

        cls.user_2 = FacilityUserFactory.create(facility=cls.facility)

        merge_users(cls.user_1, cls.user_2)
        merge_users(cls.user_1, cls.user_2)

    def test_masterylogs(self):
        self.assertEqual(
            log_models.MasteryLog.objects.filter(user=self.user_2).count(), 1
        )
        log = self.user_1_masterylog
        self.assertTrue(
            log_models.MasteryLog.objects.filter(
                summarylog__progress=log.summarylog.progress,
                user=self.user_2,
                mastery_level=log.mastery_level,
                summarylog__channel_id=log.summarylog.channel_id,
                summarylog__content_id=log.summarylog.content_id,
            ).exists()
        )

    def test_usersessionlogs(self):
        self.assertEqual(
            log_models.UserSessionLog.objects.filter(user=self.user_2).count(), 1
        )

    def test_attemptlogs(self):
        self.assertEqual(
            log_models.AttemptLog.objects.filter(user=self.user_2).count(), 1
        )
        log = self.user_1_attemptlog
        self.assertTrue(
            log_models.AttemptLog.objects.filter(
                masterylog__summarylog__progress=log.masterylog.summarylog.progress,
                user=self.user_2,
                time_spent=log.time_spent,
                masterylog__summarylog__channel_id=log.masterylog.summarylog.channel_id,
                masterylog__summarylog__content_id=log.masterylog.summarylog.content_id,
            ).exists()
        )

    def test_contentsessionlogs(self):
        self.assertEqual(
            log_models.ContentSessionLog.objects.filter(user=self.user_2).count(),
            len(self.user_1_sess_logs),
        )
        for log in self.user_1_sess_logs:
            self.assertTrue(
                log_models.ContentSessionLog.objects.filter(
                    progress=log.progress,
                    user=self.user_2,
                    content_id=log.content_id,
                    channel_id=log.channel_id,
                ).exists()
            )

    def test_contentsummarylogs(self):
        self.assertEqual(
            log_models.ContentSummaryLog.objects.filter(user=self.user_2).count(),
            len(self.user_1_summ_logs),
        )
        for log in self.user_1_summ_logs:
            self.assertTrue(
                log_models.ContentSummaryLog.objects.filter(
                    progress=log.progress,
                    user=self.user_2,
                    content_id=log.content_id,
                    channel_id=log.channel_id,
                ).exists()
            )


class MergeUsersTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        content_identifiers = [(uuid.uuid4().hex, uuid.uuid4().hex) for i in range(3)]
        ex_identifiers = (uuid.uuid4().hex, uuid.uuid4().hex)
        for i in range(1, 3):
            user = FacilityUserFactory.create(facility=cls.facility)

            sess_logs = []
            summ_logs = []

            for channel_id, content_id in content_identifiers:

                sess_logs.append(
                    ContentSessionLogFactory.create(
                        user=user,
                        channel_id=channel_id,
                        content_id=content_id,
                    )
                )

                summ_logs.append(
                    ContentSummaryLogFactory.create(
                        user=user,
                        channel_id=channel_id,
                        content_id=content_id,
                    )
                )
            channel_id, content_id = ex_identifiers
            ex_csessl = ContentSessionLogFactory.create(
                user=user,
                channel_id=channel_id,
                content_id=content_id,
            )

            ex_csmlog = ContentSummaryLogFactory.create(
                user=user,
                channel_id=channel_id,
                content_id=content_id,
            )
            masterylog = MasteryLogFactory.create(
                user=user, summarylog=ex_csmlog, mastery_level=1
            )
            attemptlog = AttemptLogFactory.create(
                user=user, masterylog=masterylog, sessionlog=ex_csessl
            )
            usersessionlog = UserSessionLogFactory.create(user=user)

            sess_logs.append(ex_csessl)
            summ_logs.append(ex_csmlog)

            setattr(cls, "user_{}".format(str(i)), user)
            setattr(cls, "user_{}_sess_logs".format(str(i)), sess_logs)
            setattr(cls, "user_{}_summ_logs".format(str(i)), summ_logs)
            setattr(cls, "user_{}_masterylog".format(str(i)), masterylog)
            setattr(cls, "user_{}_attemptlog".format(str(i)), attemptlog)
            setattr(cls, "user_{}_usersessionlog".format(str(i)), usersessionlog)

        cls.user_1_id = cls.user_1.id
        cls.user_1.birth_year = "1984"
        cls.user_1.id_number = "101"
        cls.user_1.save()
        cls.user_2.id_number = "13"
        cls.user_2.save()
        merge_users(cls.user_1, cls.user_2)

    def test_user_data_after_merge(self):
        self.user_2.refresh_from_db()
        self.assertEqual(self.user_2.birth_year, "1984")
        self.assertEqual(self.user_2.id_number, "13")

    def test_masterylogs(self):
        self.assertEqual(
            log_models.MasteryLog.objects.filter(user=self.user_2).count(), 1
        )
        log = self.user_2_masterylog
        self.assertTrue(
            log_models.MasteryLog.objects.filter(
                summarylog__progress=log.summarylog.progress,
                user=self.user_2,
                mastery_level=log.mastery_level,
                summarylog__channel_id=log.summarylog.channel_id,
                summarylog__content_id=log.summarylog.content_id,
            ).exists()
        )

    def test_usersessionlogs(self):
        self.assertEqual(
            log_models.UserSessionLog.objects.filter(user=self.user_2).count(), 2
        )

    def test_attemptlogs(self):
        self.assertEqual(
            log_models.AttemptLog.objects.filter(user=self.user_2).count(), 2
        )
        log = self.user_1_attemptlog
        self.assertTrue(
            log_models.AttemptLog.objects.filter(
                masterylog__summarylog__progress=self.user_2_attemptlog.masterylog.summarylog.progress,
                user=self.user_2,
                time_spent=log.time_spent,
                masterylog__summarylog__channel_id=log.masterylog.summarylog.channel_id,
                masterylog__summarylog__content_id=log.masterylog.summarylog.content_id,
            ).exists()
        )

    def test_contentsessionlogs(self):
        self.assertEqual(
            log_models.ContentSessionLog.objects.filter(user=self.user_2).count(),
            len(self.user_1_sess_logs) + len(self.user_2_sess_logs),
        )
        for log in self.user_1_sess_logs:
            self.assertTrue(
                log_models.ContentSessionLog.objects.filter(
                    progress=log.progress,
                    user=self.user_2,
                    content_id=log.content_id,
                    channel_id=log.channel_id,
                ).exists()
            )

    def test_contentsummarylogs(self):
        self.assertEqual(
            log_models.ContentSummaryLog.objects.filter(user=self.user_2).count(),
            len(self.user_1_summ_logs),
        )
        for log in self.user_2_summ_logs:
            self.assertTrue(
                log_models.ContentSummaryLog.objects.filter(
                    progress=log.progress,
                    user=self.user_2,
                    content_id=log.content_id,
                    channel_id=log.channel_id,
                ).exists()
            )


class AdHocGroupFactory(factory.DjangoModelFactory):
    class Meta:
        model = AdHocGroup

    name = factory.Sequence(lambda n: "AdHoc Group #%d" % n)


class ForkFacilityTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        content_identifiers = [(uuid.uuid4().hex, uuid.uuid4().hex) for i in range(3)]
        ex_identifiers = (uuid.uuid4().hex, uuid.uuid4().hex)
        cls.count = 2
        for i in range(1, 1 + cls.count):
            user = FacilityUserFactory.create(facility=cls.facility)
            coach = FacilityUserFactory.create(facility=cls.facility)
            classroom = ClassroomFactory.create(parent=cls.facility)
            classroom.add_member(user)
            classroom.add_coach(coach)
            learnergroup = LearnerGroupFactory.create(parent=classroom)
            learnergroup.add_member(user)
            adhocgroup = AdHocGroupFactory.create(parent=classroom)
            adhocgroup.add_member(user)

            for channel_id, content_id in content_identifiers:

                ContentSessionLogFactory.create(
                    user=user,
                    channel_id=channel_id,
                    content_id=content_id,
                )

                ContentSummaryLogFactory.create(
                    user=user,
                    channel_id=channel_id,
                    content_id=content_id,
                )
            channel_id, content_id = ex_identifiers
            ex_csessl = ContentSessionLogFactory.create(
                user=user,
                channel_id=channel_id,
                content_id=content_id,
            )

            ex_csmlog = ContentSummaryLogFactory.create(
                user=user,
                channel_id=channel_id,
                content_id=content_id,
            )
            masterylog = MasteryLogFactory.create(
                user=user, summarylog=ex_csmlog, mastery_level=1
            )
            AttemptLogFactory.create(
                user=user, masterylog=masterylog, sessionlog=ex_csessl
            )
            UserSessionLogFactory.create(user=user)

        fork_facility(cls.facility)
        cls.new_facility = Facility.objects.exclude(id=cls.facility.id).get()
        cls.new_dataset_id = cls.new_facility.dataset_id

    def test_users_data_after_merge(self):
        self.assertEqual(
            FacilityUser.objects.filter(facility=self.new_facility).count(),
            self.count * 2,
        )
        for user in FacilityUser.objects.filter(facility=self.facility):
            self.assertTrue(
                FacilityUser.objects.filter(
                    facility=self.new_facility,
                    username=user.username,
                    full_name=user.full_name,
                ).exists()
            )

    def test_classrooms_after_merge(self):
        self.assertEqual(
            Classroom.objects.filter(dataset_id=self.new_dataset_id).count(), self.count
        )
        for classroom in Classroom.objects.filter(dataset_id=self.new_dataset_id):
            self.assertEqual(classroom.get_members().count(), 1)
            self.assertEqual(classroom.get_coaches().count(), 1)
            old_classroom = Classroom.objects.get(
                dataset_id=self.facility.dataset_id, name=classroom.name
            )
            self.assertEqual(
                old_classroom.get_members().first().username,
                classroom.get_members().first().username,
            )
            self.assertEqual(
                old_classroom.get_coaches().first().username,
                classroom.get_coaches().first().username,
            )

    def test_learnergroups_after_merge(self):
        self.assertEqual(
            LearnerGroup.objects.filter(dataset_id=self.new_dataset_id).count(),
            self.count,
        )
        for learnergroup in LearnerGroup.objects.filter(dataset_id=self.new_dataset_id):
            self.assertEqual(learnergroup.get_members().count(), 1)
            old_learnergroup = LearnerGroup.objects.get(
                dataset_id=self.facility.dataset_id, name=learnergroup.name
            )
            self.assertEqual(
                old_learnergroup.get_members().first().username,
                learnergroup.get_members().first().username,
            )

    def test_adhocgroups_after_merge(self):
        self.assertEqual(
            AdHocGroup.objects.filter(dataset_id=self.new_dataset_id).count(),
            self.count,
        )
        for adhocgroup in AdHocGroup.objects.filter(dataset_id=self.new_dataset_id):
            self.assertEqual(adhocgroup.get_members().count(), 1)
            old_adhocgroup = AdHocGroup.objects.get(
                dataset_id=self.facility.dataset_id, name=adhocgroup.name
            )
            self.assertEqual(
                old_adhocgroup.get_members().first().username,
                adhocgroup.get_members().first().username,
            )

    def test_masterylogs(self):
        self.assertEqual(
            log_models.MasteryLog.objects.filter(
                dataset_id=self.new_dataset_id
            ).count(),
            self.count,
        )

    def test_usersessionlogs(self):
        self.assertEqual(
            log_models.UserSessionLog.objects.filter(
                dataset_id=self.new_dataset_id
            ).count(),
            self.count,
        )

    def test_attemptlogs(self):
        self.assertEqual(
            log_models.AttemptLog.objects.filter(
                dataset_id=self.new_dataset_id
            ).count(),
            self.count,
        )
        for attempt_log in log_models.AttemptLog.objects.filter(
            dataset_id=self.new_dataset_id
        ):
            for json_field in ("answer", "interaction_history"):
                self.assertNotIsInstance(getattr(attempt_log, json_field), (str,))

    def test_contentsessionlogs(self):
        self.assertEqual(
            log_models.ContentSessionLog.objects.filter(
                dataset_id=self.new_dataset_id
            ).count(),
            self.count * 4,
        )

    def test_contentsummarylogs(self):
        self.assertEqual(
            log_models.ContentSummaryLog.objects.filter(
                dataset_id=self.new_dataset_id
            ).count(),
            self.count * 4,
        )


class TestDeleteFacilityDeletesAllFacilityModels(TestCase):
    def test_deletion_inclusion(self):
        facility = FacilityFactory.create()
        all_facility_models = set(syncable_models.get_models("facilitydata"))
        delete_group = get_delete_group_for_facility(facility)
        all_deleted_models = set(qs.model for qs in delete_group.get_querysets())
        self.assertTrue(all_deleted_models.issuperset(all_facility_models))
