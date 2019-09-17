from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import datetime
import json

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from . import helpers
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.logger.models import ContentSummaryLog

DUMMY_PASSWORD = "password"


class LessonReportTestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="My Facility")
        self.classroom = Classroom.objects.create(
            name="My Classroom", parent=self.facility
        )
        self.another_classroom = Classroom.objects.create(
            name="My Another Classroom", parent=self.facility
        )

        self.facility_admin = helpers.create_facility_admin(
            username="facility_admin", password=DUMMY_PASSWORD, facility=self.facility
        )
        self.facility_and_classroom_coach = helpers.create_coach(
            username="facility_and_classroom_coach",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
            is_facility_coach=True,
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
        self.classroom_learner = helpers.create_learner(
            username="classroom_learner",
            password=DUMMY_PASSWORD,
            facility=self.facility,
            classroom=self.classroom,
        )
        self.learner = helpers.create_learner(
            username="learner", password=DUMMY_PASSWORD, facility=self.facility
        )

        # Need ContentNodes
        self.channel_id = "15f32edcec565396a1840c5413c92450"
        self.lesson_id = "15f32edcec565396a1840c5413c92452"

        self.content_ids = [
            "15f32edcec565396a1840c5413c92451",
            "15f32edcec565396a1840c5413c92452",
            "15f32edcec565396a1840c5413c92453",
        ]
        self.contentnode_ids = [
            "25f32edcec565396a1840c5413c92451",
            "25f32edcec565396a1840c5413c92452",
            "25f32edcec565396a1840c5413c92453",
        ]
        self.node_1 = ContentNode.objects.create(
            title="Node 1",
            available=True,
            id=self.contentnode_ids[0],
            content_id=self.content_ids[0],
            channel_id=self.channel_id,
        )
        self.lesson = Lesson.objects.create(
            id=self.lesson_id,
            title="My Lesson",
            created_by=self.facility_and_classroom_coach,
            collection=self.classroom,
            resources=json.dumps(
                [
                    {
                        "contentnode_id": self.node_1.id,
                        "content_id": self.node_1.content_id,
                        "channel_id": self.channel_id,
                    }
                ]
            ),
        )
        self.assignment_1 = LessonAssignment.objects.create(
            lesson=self.lesson,
            assigned_by=self.facility_and_classroom_coach,
            collection=self.classroom,
        )
        self.lessonreport_basename = "kolibri:kolibri.plugins.coach:lessonreport"
        # Need ContentSummaryLog

    def test_anon_user_cannot_access_list(self):
        get_response = self.client.get(reverse(self.lessonreport_basename + "-list"))

        self.assertEqual(get_response.status_code, 403)

    def test_learner_cannot_access_list(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        get_response = self.client.get(reverse(self.lessonreport_basename + "-list"))

        self.assertEqual(get_response.status_code, 403)

    def test_classroom_coach_cannot_access_list(self):
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(reverse(self.lessonreport_basename + "-list"))

        self.assertEqual(get_response.status_code, 403)

    def test_facility_coach_can_access_list(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(reverse(self.lessonreport_basename + "-list"))

        self.assertEqual(get_response.status_code, 200)

    def test_facility_admin_can_access_list(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(reverse(self.lessonreport_basename + "-list"))

        self.assertEqual(get_response.status_code, 200)

    def test_anon_user_cannot_access_detail(self):
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )

        self.assertEqual(get_response.status_code, 403)

    def test_learner_cannot_access_detail(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )

        self.assertEqual(get_response.status_code, 403)

    def test_another_classroom_coach_cannot_access_detail(self):
        self.client.login(
            username=self.another_classroom_coach.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )

        self.assertEqual(get_response.status_code, 403)

    def test_classroom_coach_can_access_detail(self):
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )

        self.assertEqual(get_response.status_code, 200)

    def test_facility_coach_can_access_detail(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )

        self.assertEqual(get_response.status_code, 200)

    def test_facility_admin_can_access_detail(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )

        self.assertEqual(get_response.status_code, 200)

    def test_no_progress_logged(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )
        progress = get_response.data["progress"]
        self.assertEqual(len(progress), 1)
        self.assertEqual(
            progress[0], {"num_learners_completed": 0, "contentnode_id": self.node_1.id}
        )

    def test_some_partial_progress_logged(self):
        ContentSummaryLog.objects.create(
            user=self.classroom_learner,
            content_id=self.node_1.content_id,
            channel_id=self.node_1.channel_id,
            kind="video",
            progress=0.5,
            start_timestamp=datetime.datetime.now(),
        )
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )
        progress = get_response.data["progress"]
        self.assertEqual(
            progress[0], {"num_learners_completed": 0, "contentnode_id": self.node_1.id}
        )

    def test_some_complete_progress_logged(self):
        ContentSummaryLog.objects.create(
            user=self.classroom_learner,
            content_id=self.node_1.content_id,
            channel_id=self.node_1.channel_id,
            kind="video",
            progress=1.0,
            start_timestamp=datetime.datetime.now(),
        )
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )
        progress = get_response.data["progress"]
        self.assertEqual(
            progress[0], {"num_learners_completed": 1, "contentnode_id": self.node_1.id}
        )

    def test_total_learners_value(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        get_response = self.client.get(
            reverse(
                self.lessonreport_basename + "-detail", kwargs={"pk": self.lesson.id}
            )
        )
        self.assertEqual(get_response.data["total_learners"], 1)
