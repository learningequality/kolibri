from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .. import models
from kolibri.core import error_constants
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device


DUMMY_PASSWORD = "password"


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

        response = self.client.delete(reverse("kolibri:core:exam-detail", kwargs={'pk': self.exam.id}))
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_exam_delete(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.delete(reverse("kolibri:core:exam-detail", kwargs={'pk': self.exam.id}))
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_exam_create(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("kolibri:core:exam-list"), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [],
        }, format="json")
        self.assertEqual(response.status_code, 201)

    def test_logged_in_admin_exam_create_with_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("kolibri:core:exam-list"), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.ExamAssignment.objects.get(collection=self.facility).exam, models.Exam.objects.get(title="title next"))

    def test_logged_in_admin_exam_update_no_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("kolibri:core:exam-list"), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")
        exam_id = models.Exam.objects.get(title="title next").id
        response = self.client.put(reverse("kolibri:core:exam-detail", kwargs={'pk': exam_id}), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [],
            "creator": self.admin.id,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Exam.objects.get(title="title next").assignments.count(), 0)

    def test_logged_in_admin_exam_update_different_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("kolibri:core:exam-list"), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")
        exam_id = models.Exam.objects.get(title="title next").id
        group = LearnerGroup.objects.create(name="test", parent=self.facility)
        response = self.client.put(reverse("kolibri:core:exam-detail", kwargs={'pk': exam_id}), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [{
                "collection": group.id,
            }],
            "creator": self.admin.id,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Exam.objects.get(title="title next").assignments.count(), 1)
        self.assertEqual(models.Exam.objects.get(title="title next").assignments.first().collection, group)

    def test_logged_in_admin_exam_update_additional_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("kolibri:core:exam-list"), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")
        exam_id = models.Exam.objects.get(title="title next").id
        group = LearnerGroup.objects.create(name="test", parent=self.facility)
        response = self.client.put(reverse("kolibri:core:exam-detail", kwargs={'pk': exam_id}), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [
                {
                    "collection": group.id,
                },
                {
                    "collection": self.facility.id,
                }
            ],
            "creator": self.admin.id,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Exam.objects.get(title="title next").assignments.count(), 2)
        self.assertIn(models.Exam.objects.get(title="title next").assignments.first().collection, [group, self.facility])
        self.assertIn(models.Exam.objects.get(title="title next").assignments.last().collection, [group, self.facility])

    def test_logged_in_user_exam_no_create(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.post(reverse("kolibri:core:exam-list"), {
            "title": "title next",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [],
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_exam_update(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.put(reverse("kolibri:core:exam-detail", kwargs={'pk': self.exam.id}), {
            "title": "title",
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

        response = self.client.put(reverse("kolibri:core:exam-detail", kwargs={'pk': self.exam.id}), {
            "title": "title",
            "question_count": 2,
            "active": True,
            "collection": self.facility.id,
        })
        self.assertEqual(response.status_code, 403)

    def test_cannot_create_exam_same_title_case_insensitive(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("kolibri:core:exam-list"), {
            "title": "TiTlE",
            "question_count": 1,
            "active": True,
            "collection": self.facility.id,
            "learners_see_fixed_order": False,
            "question_sources": [],
            "assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]['id'], error_constants.UNIQUE)


class ExamAssignmentAPITestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        self.admin = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.facility.add_admin(self.admin)
        self.exam = models.Exam.objects.create(
            title="title",
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

        response = self.client.delete(reverse("kolibri:core:examassignment-detail", kwargs={'pk': self.assignment.id}))
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_examassignment_can_delete(self):
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.delete(reverse("kolibri:core:examassignment-detail", kwargs={'pk': self.assignment.id}))
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_examassignment_can_create(self):
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()

        self.assignment.delete()

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("kolibri:core:examassignment-list"), {
            "exam": self.exam.id,
            "collection": self.facility.id,
        })
        self.assertEqual(response.status_code, 201)
