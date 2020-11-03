# -*- coding: utf-8 -*-
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.models import ContentNode
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment


class LessonCreationTestCase(APITestCase):
    """
    Tests for creating and fetching new Lessons
    """

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="My Facility")
        cls.classroom = Classroom.objects.create(
            name="My Classroom", parent=cls.facility
        )

        cls.admin_user = FacilityUser.objects.create(
            username="admin", facility=cls.facility
        )
        cls.admin_user.set_password("password")
        cls.admin_user.save()

        cls.facility.add_coach(cls.admin_user)

        channel_id = "15f32edcec565396a1840c5413c92450"
        content_ids = [
            "15f32edcec565396a1840c5413c92451",
            "15f32edcec565396a1840c5413c92452",
            "15f32edcec565396a1840c5413c92453",
        ]
        contentnode_ids = [
            "25f32edcec565396a1840c5413c92451",
            "25f32edcec565396a1840c5413c92452",
            "25f32edcec565396a1840c5413c92453",
        ]

        # Available ContentNode
        cls.available_node = ContentNode.objects.create(
            title="Available Content",
            available=True,
            id=contentnode_ids[0],
            content_id=content_ids[0],
            channel_id=channel_id,
        )

        # Unavailable ContentNode
        cls.unavailable_node = ContentNode.objects.create(
            title="Unavailable Content",
            available=False,
            id=contentnode_ids[1],
            content_id=content_ids[1],
            channel_id=channel_id,
        )

    def test_create_new_lesson_without_resources(self):
        self.client.login(username="admin", password="password")
        new_lesson = {
            "title": "New Lesson",
            "description": "An awesome lesson",
            "created_by": self.admin_user.id,
            "lesson_assignments": [self.classroom.id],
            "collection": self.classroom.id,
            "resources": [],
        }
        post_response = self.client.post(
            reverse("kolibri:core:lesson-list"), new_lesson, format="json"
        )
        self.assertEqual(post_response.status_code, 201)

        lesson_id = post_response.data["id"]

        get_response = self.client.get(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id})
        )
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["title"], "New Lesson")

    def test_create_new_lesson_with_assigned_learners(self):
        self.client.login(username="admin", password="password")
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self.classroom.add_member(learner)

        new_lesson = {
            "title": "New Lesson",
            "description": "An awesome lesson",
            "created_by": self.admin_user.id,
            "lesson_assignments": [self.classroom.id],
            "collection": self.classroom.id,
            "learner_ids": [learner.id],
            "resources": [],
        }
        post_response = self.client.post(
            reverse("kolibri:core:lesson-list"), new_lesson, format="json"
        )
        self.assertEqual(post_response.status_code, 201)

        lesson_id = post_response.data["id"]

        lesson = Lesson.objects.get(id=lesson_id)

        adhoc_group = AdHocGroup.objects.get(assigned_lessons__lesson=lesson)

        self.assertEqual(list(adhoc_group.get_learners()), [learner])

        get_response = self.client.get(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id})
        )
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(get_response.data["learner_ids"], [learner.id])

    def test_change_learnergroup_assignments(self):
        lgroup1 = LearnerGroup.objects.create(parent=self.classroom, name="lgroup1")
        lgroup2 = LearnerGroup.objects.create(parent=self.classroom, name="lgroup2")
        lgroup3 = LearnerGroup.objects.create(parent=self.classroom, name="lgroup3")

        self.client.login(username="admin", password="password")
        # Create new Lesson assigned to lgroup1 and lgroup2
        new_lesson = {
            "title": "Assigned To lgroup1 and lgroup2",
            "created_by": self.admin_user.id,
            "lesson_assignments": [lgroup1.id, lgroup2.id],
            "collection": self.classroom.id,
            "resources": [],
        }
        post_response = self.client.post(
            reverse("kolibri:core:lesson-list"), new_lesson, format="json"
        )
        lesson_id = post_response.data["id"]

        # Reassign Lesson to lgroup3 only
        patch_response = self.client.patch(
            reverse("kolibri:core:lesson-detail", kwargs={"pk": lesson_id}),
            {"title": "Assigned to lgroup3", "lesson_assignments": [lgroup3.id]},
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        new_assignments = LessonAssignment.objects.filter(lesson_id=lesson_id)
        self.assertEqual(len(new_assignments), 1)
        self.assertEqual(new_assignments[0].collection.id, lgroup3.id)

    def test_validate_available_resources(self):
        self.client.login(username="admin", password="password")
        new_lesson = {
            "title": "All Resources Available",
            "created_by": self.admin_user.id,
            "lesson_assignments": [self.classroom.id],
            "collection": self.classroom.id,
            "resources": [
                {
                    "contentnode_id": self.available_node.id,
                    "channel_id": self.available_node.channel_id,
                    "content_id": self.available_node.content_id,
                }
            ],
        }
        post_response = self.client.post(
            reverse("kolibri:core:lesson-list"), new_lesson, format="json"
        )
        self.assertEqual(post_response.status_code, 201)
