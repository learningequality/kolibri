from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from .. import models
from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser
from kolibri.auth.test.helpers import provision_device

DUMMY_PASSWORD = "password"

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
        self.admin = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()
        self.facility.add_admin(self.admin)
        self.exam = models.Exam.objects.create(
            title="title",
            channel_id="test",
            question_count=1,
            active=True,
            collection=self.facility,
            creator=self.admin
        )

    def test_logged_in_user_exam_no_delete(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(reverse("exam-detail", kwargs={'pk': self.exam.id}))
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_exam_delete(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.delete(reverse("exam-detail", kwargs={'pk': self.exam.id}))
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_exam_create(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("exam-list"), {
            "title": "title next",
            "channel_id": "test",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
        })
        self.assertEqual(response.status_code, 201)

    def test_logged_in_user_exam_no_create(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.post(reverse("exam-list"), {
            "title": "title next",
            "channel_id": "test",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
        })
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_exam_update(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.put(reverse("exam-detail", kwargs={'pk': self.exam.id}), {
            "title": "title",
            "channel_id": "test",
            "question_count": 2,
            "active": True,
            "collection": self.facility.id,
        })
        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_exam_no_update(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.put(reverse("exam-detail", kwargs={'pk': self.exam.id}), {
            "title": "title",
            "channel_id": "test",
            "question_count": 2,
            "active": True,
            "collection": self.facility.id,
        })
        self.assertEqual(response.status_code, 403)


class ExamAssignmentAPITestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        self.admin = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.facility.add_admin(self.admin)
        self.exam = models.Exam.objects.create(
            title="title",
            channel_id="test",
            question_count=1,
            active=True,
            collection=self.facility,
            creator=self.admin
        )
        self.assignment = models.ExamAssignment.objects.create(
            exam=self.exam,
            collection=self.facility,
            assigned_by=self.admin,
        )

    def test_logged_in_user_examassignment_no_delete(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(reverse("examassignment-detail", kwargs={'pk': self.assignment.id}))
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_examassignment_can_delete(self):
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.delete(reverse("examassignment-detail", kwargs={'pk': self.assignment.id}))
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_examassignment_can_create(self):
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()

        self.assignment.delete()

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("examassignment-list"), {
            "exam": self.exam.id,
            "collection": self.facility.id,
        })
        self.assertEqual(response.status_code, 201)
