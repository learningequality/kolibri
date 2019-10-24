from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import uuid

from django.core.urlresolvers import reverse
from le_utils.constants import content_kinds
from rest_framework.test import APITestCase

from . import helpers
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.lessons import models

DUMMY_PASSWORD = "password"


class ClassSummaryTestCase(APITestCase):

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        self.classroom = Classroom.objects.create(name="classrom", parent=self.facility)
        self.another_classroom = Classroom.objects.create(
            name="another classrom", parent=self.facility
        )

        self.facility_admin = helpers.create_facility_admin(
            username="facility_admin", password=DUMMY_PASSWORD, facility=self.facility
        )
        self.facility_coach = helpers.create_coach(
            username="facility_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            is_facility_coach=True,
        )
        self.classroom_coach = helpers.create_coach(
            username="classroom_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
        )
        self.another_classroom_coach = helpers.create_coach(
            username="another_classroom_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.another_classroom,
        )
        self.learner = helpers.create_learner(
            username="learner", password=DUMMY_PASSWORD, facility=self.facility
        )

        self.lesson = models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=self.classroom,
            created_by=self.facility_admin,
        )

        self.basename = "kolibri:kolibri.plugins.coach:classsummary"
        self.detail_name = self.basename + "-detail"

    def test_non_existent_nodes_dont_show_up_in_lessons(self):
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
        node_ids = response.data["lessons"][0]["node_ids"]
        self.assertIn(real_data["contentnode_id"], node_ids)
        # swapped data
        self.assertIn(last_node.id, node_ids)
        self.assertNotIn(fake_data["contentnode_id"], node_ids)

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
