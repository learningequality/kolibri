from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from . import helpers
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.test.helpers import provision_device

DUMMY_PASSWORD = "password"


class ClassroomNotificationsTestCase(APITestCase):
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

        self.basename = "kolibri:kolibri.plugins.coach:notifications"
        self.list_name = self.basename + "-list"

    def test_anon_user_cannot_access_list(self):
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 403)

    def test_learner_cannot_access_list(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 403)

    def test_another_classroom_coach_cannot_access_list(self):
        self.client.login(
            username=self.another_classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 403)

    def test_classroom_coach_can_access_list(self):
        self.client.login(
            username=self.classroom_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 200)

    def test_facility_coach_can_access_list(self):
        self.client.login(
            username=self.facility_coach.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 200)

    def test_facility_admin_can_access_list(self):
        self.client.login(
            username=self.facility_admin.username, password=DUMMY_PASSWORD
        )
        response = self.client.get(
            reverse(self.list_name), {"classroom_id": self.classroom.id}
        )

        self.assertEqual(response.status_code, 200)
