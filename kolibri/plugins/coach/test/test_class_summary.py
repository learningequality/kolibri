import uuid

from django.urls import reverse
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase

from . import helpers
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.lessons import models
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.test.helpers import EvaluationMixin

DUMMY_PASSWORD = "password"


class ClassSummaryTestCase(EvaluationMixin, APITestCase):

    databases = "__all__"

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        super(ClassSummaryTestCase, cls).setUpTestData()
        cls.classroom = Classroom.objects.create(name="classrom", parent=cls.facility)
        cls.another_classroom = Classroom.objects.create(
            name="another classrom", parent=cls.facility
        )

        cls.facility_admin = helpers.create_facility_admin(
            username="facility_admin", password=DUMMY_PASSWORD, facility=cls.facility
        )
        cls.facility_coach = helpers.create_coach(
            username="facility_coach",
            password=DUMMY_PASSWORD,
            facility=cls.facility,
            is_facility_coach=True,
        )
        cls.classroom_coach = helpers.create_coach(
            username="classroom_coach",
            password=DUMMY_PASSWORD,
            facility=cls.facility,
            classroom=cls.classroom,
        )
        cls.another_classroom_coach = helpers.create_coach(
            username="another_classroom_coach",
            password=DUMMY_PASSWORD,
            facility=cls.facility,
            classroom=cls.another_classroom,
        )
        cls.learner = helpers.create_learner(
            username="learner", password=DUMMY_PASSWORD, facility=cls.facility
        )

        cls.lesson = models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.facility_admin,
            # Add all created nodes from the evaluation mixin.
            resources=[
                {
                    "contentnode_id": node.id,
                    "content_id": node.content_id,
                    "channel_id": node.channel_id,
                }
                for node in cls.content_nodes
            ],
        )

        # Add all users to the classroom so their data will appear in the summary
        for user in cls.users:
            cls.classroom.add_member(user)

        cls.basename = "kolibri:kolibri.plugins.coach:classsummary"
        cls.detail_name = cls.basename + "-detail"

    def test_non_existent_nodes_do_show_up_in_lessons(self):
        node = ContentNode.objects.exclude(kind=content_kinds.TOPIC).first()
        last_node = ContentNode.objects.exclude(kind=content_kinds.TOPIC).last()
        real_data = {
            "contentnode_id": node.id,
            "content_id": node.content_id,
            "channel_id": node.channel_id,
        }
        switched_data = {
            "contentnode_id": uuid.uuid4().hex,
            "content_id": last_node.content_id,
            "channel_id": node.channel_id,
        }
        fake_data = {
            "contentnode_id": uuid.uuid4().hex,
            "content_id": uuid.uuid4().hex,
            "channel_id": node.channel_id,
        }
        self.lesson.resources = [real_data, switched_data, fake_data]
        self.lesson.save()

        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )
        lesson = response.data["lessons"][0]
        node_ids = lesson["node_ids"]
        self.assertIn(real_data["contentnode_id"], node_ids)
        # swapped data
        self.assertNotIn(last_node.id, node_ids)
        self.assertIn(fake_data["contentnode_id"], node_ids)
        self.assertTrue(lesson["missing_resource"])

    def test_anon_user_cannot_access_detail(self):
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_detail(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 403)

    def test_another_classroom_coach_cannot_access_detail(self):
        self.client.login(
            username=self.another_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 403)

    def test_classroom_coach_can_access_detail(self):
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 200)

    def test_facility_coach_can_access_detail(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 200)

    def test_facility_admin_can_access_detail(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )

        self.assertEqual(response.status_code, 200)

    def test_practice_quiz_summary(self):
        # Delete in progress tries for this test.
        MasteryLog.objects.filter(complete=False).delete()
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.detail_name, kwargs={"pk": self.classroom.id})
        )
        content_status = response.data["content_learner_status"]
        self.assertEqual(len(content_status), 2 * len(self.users))
        for user_index, user in enumerate(self.users):
            current_try = self.user_tries[user_index][0]
            try:
                previous_try = self.user_tries[user_index][1]
            except IndexError:
                previous_try = None
            content_id = current_try.summarylog.content_id
            data = next(
                d
                for d in content_status
                if d["learner_id"] == user.id and d["content_id"] == content_id
            )
            self.assertEqual(
                data["num_correct"],
                sum(current_try.attemptlogs.values_list("correct", flat=True)),
            )
            self.assertEqual(
                data["previous_num_correct"],
                sum(previous_try.attemptlogs.values_list("correct", flat=True))
                if previous_try
                else 0,
            )


class ClassSummaryDiffTestCase(EvaluationMixin, APITestCase):
    databases = "__all__"

    def test_practice_quiz_summary(self):
        provision_device()
        classroom = Classroom.objects.create(name="classrom", parent=self.facility)
        facility_coach = helpers.create_coach(
            username="facility_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            is_facility_coach=True,
        )

        models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=classroom,
            created_by=facility_coach,
            # Add all created nodes from the evaluation mixin.
            resources=[
                {
                    "contentnode_id": node.id,
                    "content_id": node.content_id,
                    "channel_id": node.channel_id,
                }
                for node in self.content_nodes
            ],
        )

        # Add all users to the classroom so their data will appear in the summary
        for user in self.users:
            classroom.add_member(user)

        # Delete in progress tries for this test.
        MasteryLog.objects.filter(complete=False).delete()
        self.client.login(username=facility_coach.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.coach:classsummary-detail",
                kwargs={"pk": classroom.id},
            )
        )
        content_status = response.data["content_learner_status"]
        self.assertEqual(len(content_status), 2 * len(self.users))
        for user_index, user in enumerate(self.users):
            current_try = self.user_tries[user_index][0]
            try:
                previous_try = self.user_tries[user_index][1]
            except IndexError:
                previous_try = None
            content_id = current_try.summarylog.content_id
            data = next(
                d
                for d in content_status
                if d["learner_id"] == user.id and d["content_id"] == content_id
            )
            self.assertEqual(
                data["num_correct"],
                sum(current_try.attemptlogs.values_list("correct", flat=True)),
            )
            self.assertEqual(
                data["previous_num_correct"],
                sum(previous_try.attemptlogs.values_list("correct", flat=True))
                if previous_try
                else 0,
            )
