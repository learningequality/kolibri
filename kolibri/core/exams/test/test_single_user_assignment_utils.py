import uuid

from django.test import TestCase
from morango.models.core import DeletedModels

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.helpers import receive_single_user_sync
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.utils.content_request import incomplete_removals_queryset
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import IndividualSyncableExam


class UpdateAssignmentsFromIndividualSyncableExamsTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = Facility.objects.create(name="My Facility")
        cls.classroom = Classroom.objects.create(
            name="My Classroom", parent=cls.facility
        )
        cls.coach = FacilityUser.objects.create(username="coach", facility=cls.facility)
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.classroom.add_member(cls.learner)

    def setUp(self):
        self.node_id = uuid.uuid4().hex
        questions = [
            {
                "exercise_id": self.node_id,
                "question_id": uuid.uuid4().hex,
                "title": "My Question",
                "counter_in_exercise": 0,
            }
        ]
        self.exam = Exam.objects.create(
            title="My Quiz",
            question_count=len(questions),
            collection=self.classroom,
            creator=self.coach,
            active=True,
            question_sources=[
                {
                    "section_title": "My Section",
                    "description": "",
                    "questions": questions,
                    "resource_pool": [],
                    "question_count": len(questions),
                    "learners_see_fixed_order": False,
                }
            ],
        )

    def _sync_assignment(self, learner, collection):
        syncable = IndividualSyncableExam.objects.create(
            user=learner,
            collection=collection,
            exam_id=self.exam.id,
            serialized_exam=IndividualSyncableExam.serialize_exam(self.exam),
        )
        receive_single_user_sync(learner, saved=[syncable])
        return syncable

    def _sync_deletion(self, syncable, *deleted):
        receive_single_user_sync(syncable.user, deleted=[*deleted, syncable])

    def test_deleted_quiz_frees_its_resources(self):
        self._sync_deletion(self._sync_assignment(self.learner, self.classroom))

        requested = set(
            ContentRemovalRequest.objects.filter(
                contentnode_id=self.node_id
            ).values_list("id", flat=True)
        )
        self.assertTrue(requested)
        self.assertEqual(
            requested,
            set(
                incomplete_removals_queryset()
                .filter(contentnode_id=self.node_id)
                .values_list("id", flat=True)
            ),
        )

    def test_quiz_another_learner_holds_stays_assigned_to_them(self):
        group_a = LearnerGroup.objects.create(name="A", parent=self.classroom)
        group_a.add_learner(self.learner)
        other = FacilityUser.objects.create(username="other", facility=self.facility)
        self.classroom.add_member(other)
        group_b = LearnerGroup.objects.create(name="B", parent=self.classroom)
        group_b.add_learner(other)

        syncable = self._sync_assignment(self.learner, group_a)
        self._sync_assignment(other, group_b)
        self._sync_deletion(syncable)

        self.assertTrue(
            Exam.objects.filter(
                id=self.exam.id,
                active=True,
                assignments__collection__membership__user=other,
            ).exists()
        )

    def test_freed_quiz_deletion_is_not_synced(self):
        self._sync_deletion(self._sync_assignment(self.learner, self.classroom))

        self.assertFalse(DeletedModels.objects.filter(id=self.exam.id).exists())
