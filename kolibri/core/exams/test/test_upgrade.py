from django.test import TestCase

from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import ExamAssignment
from kolibri.core.exams.upgrade import (
    resolve_conflicting_datasets_for_exams_and_related_models,
)


def _noop():
    pass


class ExamsUpgradeTestCase(TestCase):
    def test_resolve_conflicting_datasets_for_exams_and_related_models(self):
        facility = Facility.objects.create()
        facility_2 = Facility.objects.create()
        classroom = Classroom.objects.create(parent=facility)
        coach = FacilityUser.objects.create(
            username="coach",
            password="password",
            facility=facility,
        )
        facility.add_role(coach, role_kinds.COACH)
        ok_exam = Exam.objects.create(
            title="", question_count=1, collection=classroom, creator=coach
        )
        ok_assignment = ExamAssignment.objects.create(
            exam=ok_exam, collection=classroom, assigned_by=coach
        )
        broken_exam = Exam.objects.create(
            title="", question_count=1, collection=classroom, creator=coach
        )
        broken_assignment = ExamAssignment.objects.create(
            exam=broken_exam, collection=classroom, assigned_by=coach
        )

        # do the breaking
        broken_assignment.pre_save = _noop
        broken_assignment.dataset_id = facility_2.dataset_id
        broken_assignment.save()
        broken_exam.pre_save = _noop
        broken_exam.dataset_id = facility_2.dataset_id
        broken_exam.save()

        # verify prior to upgrade
        broken_exam.refresh_from_db()
        self.assertNotEqual(broken_exam.dataset_id, classroom.dataset_id)
        self.assertIsNotNone(broken_exam.creator)
        broken_assignment.refresh_from_db()
        self.assertNotEqual(broken_assignment.dataset_id, classroom.dataset_id)
        self.assertIsNotNone(broken_assignment.assigned_by)
        resolve_conflicting_datasets_for_exams_and_related_models()

        # ensure broken exam is no longer broken
        broken_exam.refresh_from_db()
        self.assertEqual(broken_exam.dataset_id, classroom.dataset_id)
        self.assertIsNone(broken_exam.creator)
        broken_assignment.refresh_from_db()
        self.assertEqual(broken_assignment.dataset_id, classroom.dataset_id)
        self.assertIsNone(broken_assignment.assigned_by)

        # ensure ok exam is unchanged
        ok_exam.refresh_from_db()
        self.assertEqual(ok_exam.dataset_id, classroom.dataset_id)
        self.assertIsNotNone(ok_exam.creator)
        ok_assignment.refresh_from_db()
        self.assertEqual(ok_assignment.dataset_id, classroom.dataset_id)
        self.assertIsNotNone(ok_assignment.assigned_by)
