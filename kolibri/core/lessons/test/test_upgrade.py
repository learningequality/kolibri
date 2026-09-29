from django.test import TestCase

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.device.utils import set_device_settings
from kolibri.core.lessons.models import Lesson
from kolibri.core.lessons.models import LessonAssignment
from kolibri.core.lessons.test.test_single_user_assignment_utils import (
    SingleUserLessonTestCase,
)
from kolibri.core.lessons.upgrade import delete_stale_single_user_lessons
from kolibri.core.lessons.upgrade import (
    resolve_conflicting_datasets_for_lessons_and_related_models,
)


def _noop():
    pass


class LessonsUpgradeTestCase(TestCase):
    def test_resolve_conflicting_datasets_for_lessons_and_related_models(self):
        facility = Facility.objects.create()
        facility_2 = Facility.objects.create()
        classroom = Classroom.objects.create(parent=facility)
        coach = FacilityUser.objects.create(
            username="coach",
            password="password",
            facility=facility,
        )
        facility.add_role(coach, role_kinds.COACH)
        ok_lesson = Lesson.objects.create(
            title="", collection=classroom, created_by=coach
        )
        ok_assignment = LessonAssignment.objects.create(
            lesson=ok_lesson, collection=classroom, assigned_by=coach
        )
        broken_lesson = Lesson.objects.create(
            title="", collection=classroom, created_by=coach
        )
        broken_assignment = LessonAssignment.objects.create(
            lesson=broken_lesson, collection=classroom, assigned_by=coach
        )

        # do the breaking
        broken_assignment.pre_save = _noop
        broken_assignment.dataset_id = facility_2.dataset_id
        broken_assignment.save()
        broken_lesson.pre_save = _noop
        broken_lesson.dataset_id = facility_2.dataset_id
        broken_lesson.save()

        # verify prior to upgrade
        broken_lesson.refresh_from_db()
        self.assertNotEqual(broken_lesson.dataset_id, classroom.dataset_id)
        self.assertIsNotNone(broken_lesson.created_by)
        broken_assignment.refresh_from_db()
        self.assertNotEqual(broken_assignment.dataset_id, classroom.dataset_id)
        self.assertIsNotNone(broken_assignment.assigned_by)
        resolve_conflicting_datasets_for_lessons_and_related_models()

        # ensure broken lesson is no longer broken
        broken_lesson.refresh_from_db()
        self.assertEqual(broken_lesson.dataset_id, classroom.dataset_id)
        self.assertIsNone(broken_lesson.created_by)
        broken_assignment.refresh_from_db()
        self.assertEqual(broken_assignment.dataset_id, classroom.dataset_id)
        self.assertIsNone(broken_assignment.assigned_by)

        # ensure ok lesson is unchanged
        ok_lesson.refresh_from_db()
        self.assertEqual(ok_lesson.dataset_id, classroom.dataset_id)
        self.assertIsNotNone(ok_lesson.created_by)
        ok_assignment.refresh_from_db()
        self.assertEqual(ok_assignment.dataset_id, classroom.dataset_id)
        self.assertIsNotNone(ok_assignment.assigned_by)


class DeleteStaleSingleUserLessonsTestCase(SingleUserLessonTestCase):
    def test_unassigned_lesson_is_freed_on_a_single_user_device(self):
        set_device_settings(subset_of_users_device=True)

        delete_stale_single_user_lessons()

        self._assert_resources_freed()

    def test_lesson_with_no_local_recipient_is_freed_on_a_single_user_device(self):
        set_device_settings(subset_of_users_device=True)
        group = LearnerGroup.objects.create(name="A", parent=self.classroom)
        LessonAssignment.objects.create(
            lesson=self.lesson, collection=group, assigned_by=self.coach
        )

        delete_stale_single_user_lessons()

        self._assert_resources_freed()

    def test_unassigned_lesson_is_kept_on_a_full_device(self):
        delete_stale_single_user_lessons()

        self.assertTrue(Lesson.objects.filter(id=self.lesson.id).exists())
