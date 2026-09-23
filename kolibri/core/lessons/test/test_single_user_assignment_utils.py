import uuid

from django.test import TestCase
from morango.models.core import DeletedModels

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.models import Membership
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.helpers import receive_single_user_sync
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.utils.content_request import incomplete_removals_queryset
from kolibri.core.lessons.models import IndividualSyncableLesson
from kolibri.core.lessons.models import Lesson


class UpdateAssignmentsFromIndividualSyncableLessonsTestCase(TestCase):
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
        self.lesson = Lesson.objects.create(
            title="My Lesson",
            collection=self.classroom,
            created_by=self.coach,
            is_active=True,
            resources=[
                {
                    "contentnode_id": self.node_id,
                    "content_id": uuid.uuid4().hex,
                    "channel_id": uuid.uuid4().hex,
                }
            ],
        )

    def _sync_assignment(self, learner, collection):
        syncable = IndividualSyncableLesson.objects.create(
            user=learner,
            collection=collection,
            lesson_id=self.lesson.id,
            serialized_lesson=IndividualSyncableLesson.serialize_lesson(self.lesson),
        )
        receive_single_user_sync(learner, saved=[syncable])
        return syncable

    def _sync_deletion(self, syncable, *deleted):
        receive_single_user_sync(syncable.user, deleted=[*deleted, syncable])

    def _assert_resources_freed(self):
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

    def test_deleted_lesson_frees_its_resources(self):
        self._sync_deletion(self._sync_assignment(self.learner, self.classroom))

        self._assert_resources_freed()

    def test_learner_removed_from_group_frees_its_resources(self):
        group = LearnerGroup.objects.create(name="A", parent=self.classroom)
        group.add_learner(self.learner)
        syncable = self._sync_assignment(self.learner, group)
        self._sync_deletion(
            syncable, Membership.objects.get(user=self.learner, collection=group)
        )

        self._assert_resources_freed()

    def test_lesson_another_learner_holds_stays_assigned_to_them(self):
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
            Lesson.objects.filter(
                id=self.lesson.id,
                is_active=True,
                lesson_assignments__collection__membership__user=other,
            ).exists()
        )

    def test_freed_lesson_deletion_is_not_synced(self):
        self._sync_deletion(self._sync_assignment(self.learner, self.classroom))

        self.assertFalse(DeletedModels.objects.filter(id=self.lesson.id).exists())
