from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment


class LearnerLessonTestCase(APITestCase):
    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="My Facility")
        self.learner_user = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self.learner_user.set_password("password")
        self.learner_user.save()
        self.basename = "kolibri:kolibri.plugins.learn:learnerlesson"
        self.classroom = Classroom.objects.create(
            name="Own Classroom", parent=self.facility
        )
        self.classroom.add_member(self.learner_user)

    def test_must_be_authenticated(self):
        get_request = self.client.get(reverse(self.basename + "-list"))
        self.assertEqual(get_request.status_code, 403)

    def test_learner_can_access_own_lessons(self):
        own_lesson = Lesson.objects.create(
            title="Lesson",
            collection=self.classroom,
            created_by=self.learner_user,
            is_active=True,
        )
        LessonAssignment.objects.create(
            lesson=own_lesson, assigned_by=self.learner_user, collection=self.classroom
        )
        self.client.login(username="learner", password="password")
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": own_lesson.id})
        )
        self.assertEqual(get_request.data["id"], own_lesson.id)

    def test_learner_cannot_access_not_own_lessons(self):
        # Lesson created in Classroom, but not assigned
        other_classroom = Classroom.objects.create(
            name="Other Classroom", parent=self.facility
        )
        other_lesson = Lesson.objects.create(
            title="Lesson",
            collection=other_classroom,
            created_by=self.learner_user,
            is_active=True,
        )
        LessonAssignment.objects.create(
            lesson=other_lesson,
            assigned_by=self.learner_user,
            collection=other_classroom,
        )
        self.client.login(username="learner", password="password")
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": other_lesson.id})
        )
        self.assertEqual(get_request.status_code, 404)

    def test_learner_cannot_access_own_inactive_lesson(self):
        own_lesson = Lesson.objects.create(
            title="Lesson",
            collection=self.classroom,
            created_by=self.learner_user,
            is_active=False,
        )
        LessonAssignment.objects.create(
            lesson=own_lesson, assigned_by=self.learner_user, collection=self.classroom
        )
        self.client.login(username="learner", password="password")
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": own_lesson.id})
        )
        self.assertEqual(get_request.status_code, 404)

    def test_learner_assigned_same_lesson_multiple_times_only_return_one(self):
        own_lesson = Lesson.objects.create(
            title="Lesson",
            collection=self.classroom,
            created_by=self.learner_user,
            is_active=True,
        )
        LessonAssignment.objects.create(
            lesson=own_lesson, assigned_by=self.learner_user, collection=self.classroom
        )
        group = LearnerGroup.objects.create(name="Own Group", parent=self.classroom)
        group.add_member(self.learner_user)
        LessonAssignment.objects.create(
            lesson=own_lesson, assigned_by=self.learner_user, collection=group
        )
        self.client.login(username="learner", password="password")
        get_request = self.client.get(
            reverse(self.basename + "-detail", kwargs={"pk": own_lesson.id})
        )
        self.assertEqual(get_request.status_code, 200)
