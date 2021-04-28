from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .. import models
from kolibri.core import error_constants
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device


DUMMY_PASSWORD = "password"


class LessonAPITestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="MyFac")
        cls.admin = FacilityUser.objects.create(username="admin", facility=cls.facility)
        cls.admin.set_password(DUMMY_PASSWORD)
        cls.admin.save()
        cls.facility.add_admin(cls.admin)
        cls.classroom = Classroom.objects.create(name="Classroom", parent=cls.facility)
        cls.lesson = models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=cls.classroom,
            created_by=cls.admin,
        )

    def test_logged_in_user_lesson_no_delete(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.delete(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id})
        )
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_lesson_delete(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.delete(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id})
        )
        self.assertEqual(response.status_code, 204)

    def test_logged_in_admin_lesson_create(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)

    def test_logged_in_admin_lesson_create_with_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [self.classroom.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            models.LessonAssignment.objects.get(collection=self.classroom).lesson,
            models.Lesson.objects.get(title="title next"),
        )

    def test_logged_in_admin_lesson_update_no_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [self.classroom.id],
            },
            format="json",
        )
        lesson_id = models.Lesson.objects.get(title="title next").id
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [],
                "created_by": self.admin.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Lesson.objects.get(title="title next").lesson_assignments.count(), 0
        )

    def test_logged_in_admin_lesson_update_different_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [self.classroom.id],
            },
            format="json",
        )
        lesson_id = models.Lesson.objects.get(title="title next").id
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [group.id],
                "created_by": self.admin.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Lesson.objects.get(title="title next").lesson_assignments.count(), 1
        )
        self.assertEqual(
            models.Lesson.objects.get(title="title next")
            .lesson_assignments.first()
            .collection,
            group,
        )

    def test_logged_in_admin_lesson_update_additional_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [self.classroom.id],
            },
            format="json",
        )
        lesson_id = models.Lesson.objects.get(title="title next").id
        group = LearnerGroup.objects.create(name="test", parent=self.classroom)
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [group.id, self.classroom.id],
                "created_by": self.admin.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Lesson.objects.get(title="title next").lesson_assignments.count(), 2
        )
        self.assertIn(
            models.Lesson.objects.get(title="title next")
            .lesson_assignments.first()
            .collection,
            [group, self.classroom],
        )
        self.assertIn(
            models.Lesson.objects.get(title="title next")
            .lesson_assignments.last()
            .collection,
            [group, self.classroom],
        )

    def test_logged_in_admin_lesson_update_learner_assignments(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [self.classroom.id],
            },
            format="json",
        )

        user = FacilityUser.objects.create(username="u", facility=self.facility)

        self.classroom.add_member(user)
        lesson_id = models.Lesson.objects.get(title="title next").id
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [],
                "created_by": self.admin.id,
                "learner_ids": [user.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            models.Lesson.objects.get(title="title next").lesson_assignments.count(), 1
        )
        adhoc_group = AdHocGroup.objects.get(parent=self.classroom)
        self.assertEqual(len(adhoc_group.get_members()), 1)
        self.assertEqual(adhoc_group.get_members()[0], user)
        self.assertEqual(
            models.LessonAssignment.objects.get(collection=adhoc_group),
            models.Lesson.objects.get(title="title next").lesson_assignments.first(),
        )

    def test_logged_in_admin_lesson_update_learner_assignments_wrong_collection(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [self.classroom.id],
            },
            format="json",
        )

        user = FacilityUser.objects.create(username="u", facility=self.facility)

        lesson_id = models.Lesson.objects.get(title="title next").id
        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [],
                "created_by": self.admin.id,
                "learner_ids": [user.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        with self.assertRaises(AdHocGroup.DoesNotExist):
            AdHocGroup.objects.get(parent=self.classroom)

    def test_logged_in_user_lesson_no_create(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "title next",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_logged_in_admin_lesson_update(self):

        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "title": "title",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_lesson_no_update(self):

        user = FacilityUser.objects.create(username="learner", facility=self.facility)
        user.set_password("pass")
        user.save()

        self.client.login(username=user.username, password="pass")

        response = self.client.put(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "id": self.lesson.id,
                "title": "title",
                "is_active": True,
                "collection": self.classroom.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_cannot_create_lesson_same_title_case_insensitive(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": "TiTlE",
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [self.classroom.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_can_update_lesson_same_title(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.patch(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "id": self.lesson.id,
                "title": "title",
                "is_active": False,
                "collection": self.classroom.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_can_update_lesson_multiple_same_title(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=self.classroom,
            created_by=self.admin,
        )

        response = self.client.patch(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "id": self.lesson.id,
                "title": "title",
                "is_active": False,
                "collection": self.classroom.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_can_update_lesson_to_same_title_as_other_lesson(self):
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        models.Lesson.objects.create(
            title="titular",
            is_active=True,
            collection=self.classroom,
            created_by=self.admin,
        )

        response = self.client.patch(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": self.lesson.id}),
            {
                "id": self.lesson.id,
                "title": "titular",
                "is_active": True,
                "collection": self.classroom.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)

    def test_cannot_create_lesson_same_title_as_multiple_lessons(self):
        # Make a second copy of the lesson so that we now have two with the same title
        models.Lesson.objects.create(
            title="title",
            is_active=True,
            collection=self.classroom,
            created_by=self.admin,
        )
        self.client.login(username=self.admin.username, password=DUMMY_PASSWORD)

        response = self.client.post(
            reverse("kolibri:core:lesson-list"),
            {
                "title": self.lesson.title,
                "is_active": True,
                "collection": self.classroom.id,
                "lesson_assignments": [self.classroom.id],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data[0]["id"], error_constants.UNIQUE)
