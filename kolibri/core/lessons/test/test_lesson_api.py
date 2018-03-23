from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from .. import models
from kolibri.auth.models import Facility
from kolibri.auth.models import FacilityUser
from kolibri.auth.models import LearnerGroup
from kolibri.auth.test.helpers import provision_device

DUMMY_PASSWORD = "password"

class LessonAPITestCase(APITestCase):

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="MyFac")
        self.admin = FacilityUser.objects.create(username="admin", facility=self.facility)
        self.admin.set_password(DUMMY_PASSWORD)
        self.admin.save()
        self.facility.add_admin(self.admin)
        self.lesson = models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=self.facility,
            created_by=self.admin
        )

    def test_logged_in_user_lesson_no_delete(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(reverse("lesson-detail", kwargs={'pk': self.lesson.id}))
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_lesson_delete(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.delete(reverse("lesson-detail", kwargs={'pk': self.lesson.id}))
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_lesson_create(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("lesson-list"), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [],
        }, format="json")
        self.assertEqual(response.status_code, 201)

    def test_logged_in_admin_lesson_create_with_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("lesson-list"), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.LessonAssignment.objects.get(collection=self.facility).lesson, models.Lesson.objects.get(title="title next"))

    def test_logged_in_admin_lesson_update_no_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("lesson-list"), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")
        lesson_id = models.Lesson.objects.get(title="title next").id
        response = self.client.put(reverse("lesson-detail", kwargs={'pk': lesson_id}), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [],
            "created_by": self.admin.id,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Lesson.objects.get(title="title next").lesson_assignments.count(), 0)

    def test_logged_in_admin_lesson_update_different_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("lesson-list"), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")
        lesson_id = models.Lesson.objects.get(title="title next").id
        group = LearnerGroup.objects.create(name="test", parent=self.facility)
        response = self.client.put(reverse("lesson-detail", kwargs={'pk': lesson_id}), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [{
                "collection": group.id,
            }],
            "created_by": self.admin.id,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Lesson.objects.get(title="title next").lesson_assignments.count(), 1)
        self.assertEqual(models.Lesson.objects.get(title="title next").lesson_assignments.first().collection, group)

    def test_logged_in_admin_lesson_update_additional_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(reverse("lesson-list"), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [{
                "collection": self.facility.id,
            }],
        }, format="json")
        lesson_id = models.Lesson.objects.get(title="title next").id
        group = LearnerGroup.objects.create(name="test", parent=self.facility)
        response = self.client.put(reverse("lesson-detail", kwargs={'pk': lesson_id}), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [
                {
                    "collection": group.id,
                },
                {
                    "collection": self.facility.id,
                }
            ],
            "created_by": self.admin.id,
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Lesson.objects.get(title="title next").lesson_assignments.count(), 2)
        self.assertIn(models.Lesson.objects.get(title="title next").lesson_assignments.first().collection, [group, self.facility])
        self.assertIn(models.Lesson.objects.get(title="title next").lesson_assignments.last().collection, [group, self.facility])

    def test_logged_in_user_lesson_no_create(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.post(reverse("lesson-list"), {
            "title": "title next",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [],
        }, format="json")
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_lesson_update(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.put(reverse("lesson-detail", kwargs={'pk': self.lesson.id}), {
            "title": "title",
            "is_active": True,
            "collection": self.facility.id,
            "lesson_assignments": [],
        }, format="json")
        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_lesson_no_update(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.put(reverse("lesson-detail", kwargs={'pk': self.lesson.id}), {
            "title": "title",
            "is_active": True,
            "collection": self.facility.id,
        })
        self.assertEqual(response.status_code, 403)
