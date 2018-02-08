from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from .. import models
from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser
from kolibri.auth.test.helpers import provision_device

class UserExamAPITestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.exam = models.Exam.objects.create(
            title="title",
            channel_id="test",
            question_count=1,
            active=True,
            collection=self.facility,
            creator=user
        )
        self.assignment = models.ExamAssignment.objects.create(
            exam=self.exam,
            collection=self.facility,
            assigned_by=user,
        )

    def test_logged_in_userexam_list(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.get(reverse("userexam-list"))
        self.assertEqual(len(response.data), 1)

    def test_logged_in_user_userexam_no_delete(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(reverse("userexam-detail", kwargs={'pk': self.assignment.id}))
        self.assertEqual(response.status_code, 403)

    def test_anonymous_userexam_list(self):
        response = self.client.get(reverse("userexam-list"))
        self.assertEqual(len(response.data), 0)


class ExamAPITestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.exam = models.Exam.objects.create(
            title="title",
            channel_id="test",
            question_count=1,
            active=True,
            collection=self.facility,
            creator=user
        )

    def test_logged_in_user_exam_no_delete(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(reverse("exam-detail", kwargs={'pk': self.exam.id}))
        self.assertEqual(response.status_code, 403)


class ExamAssignmentAPITestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        user = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.exam = models.Exam.objects.create(
            title="title",
            channel_id="test",
            question_count=1,
            active=True,
            collection=self.facility,
            creator=user
        )
        self.assignment = models.ExamAssignment.objects.create(
            exam=self.exam,
            collection=self.facility,
            assigned_by=user,
        )

    def test_logged_in_user_examassignment_no_delete(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(reverse("examassignment-detail", kwargs={'pk': self.assignment.id}))
        self.assertEqual(response.status_code, 403)
