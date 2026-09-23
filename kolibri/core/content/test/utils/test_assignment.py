import uuid
from unittest import mock

from django.db.models.functions import NullIf
from django.test import TestCase
from morango.models import Store

from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import LearnerGroup
from kolibri.core.auth.models import Membership
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.utils.assignment import ContentAssignment
from kolibri.core.content.utils.assignment import ContentAssignmentManager
from kolibri.core.content.utils.assignment import DeletedAssignment
from kolibri.core.courses.models import CourseSession
from kolibri.core.courses.models import CourseSessionAssignment
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import IndividualSyncableExam
from kolibri.core.lessons.models import IndividualSyncableLesson
from kolibri.core.lessons.models import Lesson

_module = "kolibri.core.content.utils.assignment."


class ContentAssignmentManagerTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        super().setUp()

        self.model = mock.MagicMock()
        self.model.objects = mock.MagicMock()
        self.model.morango_model_name = "test_model"
        self.manager = ContentAssignmentManager()
        self.manager.model = self.model
        self.manager.name = self.model.morango_model_name

        self.assignment = ContentAssignment(
            contentnode_id=uuid.uuid4().hex,
            source_model=self.manager.name,
            source_id=uuid.uuid4().hex,
            metadata={},
        )

    @mock.patch(_module + "ContentAssignmentManager._get_assignments")
    def test_find_downloadable_assignments__dataset_id(self, get_assignments_mock):
        self.manager.filters = {"test": "test"}
        get_assignments_mock.return_value = [self.assignment]

        count = 0
        for assignment in self.manager.find_downloadable_assignments(
            dataset_id="test_dataset"
        ):
            count += 1
            self.assertEqual(assignment, self.assignment)

        self.assertEqual(count, 1)
        qs = self.model.objects.all.return_value
        qs.filter.assert_called_once_with(dataset_id="test_dataset")
        qs.filter.return_value.filter.assert_called_once_with(test="test")
        get_assignments_mock.assert_called_once_with(
            qs.filter.return_value.filter.return_value.distinct.return_value
        )

    @mock.patch(_module + "ContentAssignmentManager._get_modified_store")
    @mock.patch(_module + "ContentAssignmentManager._get_assignments")
    def test_find_downloadable_assignments__transfer_session_id(
        self, get_assignments_mock, get_modified_store_mock
    ):
        store_qs = mock.MagicMock()
        get_modified_store_mock.return_value = store_qs
        store_qs.annotate.return_value = store_qs
        store_qs.exclude.return_value = store_qs

        store_ids = [uuid.uuid4().hex for _ in range(1)]
        store_qs.values_list.return_value = store_ids

        get_assignments_mock.return_value = [self.assignment]

        count = 0
        for assignment in self.manager.find_downloadable_assignments(
            transfer_session_id="test_transfer_session"
        ):
            count += 1
            self.assertEqual(assignment, self.assignment)

        self.assertEqual(count, 1)
        # empty deserialization errors are normalized to NULL so that they compare the same as
        # the NULL written by `Store.unset_deserialization_error`
        annotation = store_qs.annotate.call_args[1]["_deserialization_error"]
        self.assertIsInstance(annotation, NullIf)
        exclude_q = store_qs.exclude.call_args[0][0]
        self.assertEqual(
            str(exclude_q),
            "(OR: ('deleted', True), ('hard_deleted', True), ('_deserialization_error__isnull', False))",
        )

        qs = self.model.objects.all.return_value
        get_modified_store_mock.assert_called_once_with("test_transfer_session")
        qs.filter.assert_called_once_with(pk__in=store_ids)
        get_assignments_mock.assert_called_once_with(qs.filter.return_value)

    def test_find_downloadable_assignments__one_parameter(self):
        with self.assertRaises(ValueError):
            next(self.manager.find_downloadable_assignments())

        with self.assertRaises(ValueError):
            next(
                self.manager.find_downloadable_assignments(
                    dataset_id="test_dataset",
                    transfer_session_id="test_transfer_session",
                )
            )

    @mock.patch(_module + "ContentAssignmentManager._get_assignments")
    def test_find_removable_assignments__dataset_id(self, get_assignments_mock):
        self.manager.filters = {"test": "test"}
        get_assignments_mock.return_value = [self.assignment]

        count = 0
        for assignment in self.manager.find_removable_assignments(
            dataset_id="test_dataset"
        ):
            count += 1
            self.assertEqual(assignment, self.assignment)

        self.assertEqual(count, 1)
        qs = self.model.objects.all.return_value
        qs.filter.assert_called_once_with(dataset_id="test_dataset")
        qs.filter.return_value.exclude.assert_called_once_with(test="test")
        get_assignments_mock.assert_called_once_with(
            qs.filter.return_value.exclude.return_value
        )

    @mock.patch(_module + "ContentAssignmentManager._get_modified_store")
    @mock.patch(_module + "ContentAssignmentManager._get_assignments")
    def test_find_removable_assignments__transfer_session_id(
        self, get_assignments_mock, get_modified_store_mock
    ):
        store_qs = mock.MagicMock()
        get_modified_store_mock.return_value = store_qs

        modified_store_ids = [uuid.uuid4().hex for _ in range(1)]
        store_qs.values_list.return_value = modified_store_ids
        get_assignments_mock.return_value = [self.assignment]

        deleted_store_ids = [uuid.uuid4().hex for _ in range(1)]
        store_qs.filter.return_value.values_list.return_value = deleted_store_ids

        assignments = []
        for assignment in self.manager.find_removable_assignments(
            transfer_session_id="test_transfer_session"
        ):
            assignments.append(assignment)

        deleted_assignments = [
            assignment
            for assignment in assignments
            if isinstance(assignment, DeletedAssignment)
        ]
        modified_assignments = [
            assignment
            for assignment in assignments
            if isinstance(assignment, ContentAssignment)
        ]
        self.assertEqual(len(deleted_assignments), 1)
        self.assertEqual(len(modified_assignments), 1)
        self.assertEqual(deleted_assignments[0].source_id, deleted_store_ids[0])
        self.assertEqual(modified_assignments[0], self.assignment)

        filter_call = store_qs.filter.call_args[0][0]
        self.assertEqual(
            str(filter_call), "(OR: ('deleted', True), ('hard_deleted', True))"
        )

        qs = self.model.objects.all.return_value
        get_modified_store_mock.assert_called_once_with("test_transfer_session")
        qs.filter.assert_called_once_with(pk__in=modified_store_ids)
        get_assignments_mock.assert_called_once_with(qs.filter.return_value)

    def test_find_removable_assignments__one_parameter(self):
        with self.assertRaises(ValueError):
            next(self.manager.find_removable_assignments())

        with self.assertRaises(ValueError):
            next(
                self.manager.find_removable_assignments(
                    dataset_id="test_dataset",
                    transfer_session_id="test_transfer_session",
                )
            )

    def test_get_assignments__no_lookup_func(self):
        self.manager.lookup_field = "test_lookup_field"

        source_id1 = uuid.uuid4().hex
        source_id2 = uuid.uuid4().hex
        contentnode_id1 = uuid.uuid4().hex
        contentnode_id2 = uuid.uuid4().hex

        qs = mock.MagicMock()
        qs.values_list.return_value = [
            # (source_id, contentnode_id)
            (source_id1, contentnode_id1),
            (source_id2, contentnode_id2),
        ]

        assignments = list(self.manager._get_assignments(qs))
        qs.values_list.assert_called_once_with("id", "test_lookup_field")
        self.assertEqual(len(assignments), 2)

        self.assertEqual(assignments[0].contentnode_id, contentnode_id1)
        self.assertEqual(assignments[0].source_id, source_id1)

        self.assertEqual(assignments[1].contentnode_id, contentnode_id2)
        self.assertEqual(assignments[1].source_id, source_id2)

        for assignment in assignments:
            self.assertEqual(assignment.source_model, self.model.morango_model_name)
            self.assertEqual(assignment.metadata, None)
            self.assertIsNone(assignment.channel_version)

    def test_get_assignments__with_version_field(self):
        self.manager.lookup_field = "test_lookup_field"
        self.manager.channel_version_field = "test_version_field"

        source_id1 = uuid.uuid4().hex
        source_id2 = uuid.uuid4().hex
        contentnode_id1 = uuid.uuid4().hex
        contentnode_id2 = uuid.uuid4().hex

        qs = mock.MagicMock()
        qs.values_list.return_value = [
            # (source_id, contentnode_id, version)
            (source_id1, contentnode_id1, 1),
            (source_id2, contentnode_id2, 2),
        ]

        assignments = list(self.manager._get_assignments(qs))
        qs.values_list.assert_called_once_with(
            "id", "test_lookup_field", "test_version_field"
        )
        self.assertEqual(len(assignments), 2)

        self.assertEqual(assignments[0].contentnode_id, contentnode_id1)
        self.assertEqual(assignments[0].source_id, source_id1)
        self.assertEqual(assignments[0].channel_version, 1)

        self.assertEqual(assignments[1].contentnode_id, contentnode_id2)
        self.assertEqual(assignments[1].source_id, source_id2)
        self.assertEqual(assignments[1].channel_version, 2)

    def test_get_assignments__version_field_none_when_not_set(self):
        self.manager.lookup_field = "test_lookup_field"
        # channel_version_field not set (None by default)

        source_id = uuid.uuid4().hex
        contentnode_id = uuid.uuid4().hex

        qs = mock.MagicMock()
        qs.values_list.return_value = [(source_id, contentnode_id)]

        assignments = list(self.manager._get_assignments(qs))
        qs.values_list.assert_called_once_with("id", "test_lookup_field")
        self.assertEqual(len(assignments), 1)
        self.assertIsNone(assignments[0].channel_version)

    def test_get_assignments__lookup_func(self):
        metadata = {"test": "test"}
        self.manager.lookup_field = "test_lookup_field"
        self.manager.lookup_func = lambda x: (x, metadata)

        source_id1 = uuid.uuid4().hex
        source_id2 = uuid.uuid4().hex
        contentnode_id1 = uuid.uuid4().hex
        contentnode_id2 = uuid.uuid4().hex

        qs = mock.MagicMock()
        qs.values_list.return_value = [
            # (source_id, contentnode_id)
            (source_id1, contentnode_id1),
            (source_id2, contentnode_id2),
        ]

        assignments = list(self.manager._get_assignments(qs))
        qs.values_list.assert_called_once_with("id", "test_lookup_field")
        self.assertEqual(len(assignments), 2)

        self.assertEqual(assignments[0].contentnode_id, contentnode_id1)
        self.assertEqual(assignments[0].source_id, source_id1)

        self.assertEqual(assignments[1].contentnode_id, contentnode_id2)
        self.assertEqual(assignments[1].source_id, source_id2)

        for assignment in assignments:
            self.assertEqual(assignment.source_model, self.model.morango_model_name)
            self.assertEqual(assignment.metadata, metadata)

    def test_get_assignments__one_to_many(self):
        metadata = {"test": "test"}

        self.manager.one_to_many = True
        self.manager.lookup_field = "test_lookup_field"
        self.manager.lookup_func = lambda node_ids: [
            (node_id, metadata) for node_id in node_ids
        ]

        source_id1 = uuid.uuid4().hex
        source_id2 = uuid.uuid4().hex
        source_id3 = uuid.uuid4().hex
        contentnode_id1 = uuid.uuid4().hex
        contentnode_id2 = uuid.uuid4().hex
        contentnode_id3 = uuid.uuid4().hex

        qs = mock.MagicMock()

        # source_id1 tests deduplication
        qs.values_list.return_value = [
            # (source_id, lookup_field_value)
            (source_id1, [contentnode_id1, contentnode_id1, contentnode_id2]),
            (source_id2, [contentnode_id2]),
            (source_id3, [contentnode_id3]),
        ]

        assignments = list(self.manager._get_assignments(qs))
        qs.values_list.assert_called_once_with("id", "test_lookup_field")
        self.assertEqual(len(assignments), 4)

        self.assertEqual(assignments[0].contentnode_id, contentnode_id1)
        self.assertEqual(assignments[0].source_id, source_id1)

        self.assertEqual(assignments[1].contentnode_id, contentnode_id2)
        self.assertEqual(assignments[1].source_id, source_id1)

        self.assertEqual(assignments[2].contentnode_id, contentnode_id2)
        self.assertEqual(assignments[2].source_id, source_id2)

        self.assertEqual(assignments[3].contentnode_id, contentnode_id3)
        self.assertEqual(assignments[3].source_id, source_id3)

        for assignment in assignments:
            self.assertEqual(assignment.source_model, self.model.morango_model_name)
            self.assertEqual(assignment.metadata, metadata)


class ContentAssignmentManagerIntegrationTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

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

        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.classroom.add_member(cls.learner)

        cls.facility.add_coach(cls.admin_user)

    def test_on_downloadable_assignment__lesson(self):
        callable_mock = mock.MagicMock()
        ContentAssignmentManager.on_any_downloadable_assignment(callable_mock)

        resources = [
            {
                "contentnode_id": uuid.uuid4().hex,
                "content_id": uuid.uuid4().hex,
                "channel_id": uuid.uuid4().hex,
            }
        ]

        lesson = Lesson(
            title="My Lesson",
            collection=self.classroom,
            created_by=self.admin_user,
            is_active=False,
            resources=resources,
        )
        lesson.save()
        callable_mock.assert_not_called()

        lesson.is_active = True
        lesson.save()
        callable_mock.assert_called_once()
        self.assertEqual(callable_mock.call_args[0][0], self.facility.dataset_id)
        assignments = list(callable_mock.call_args[0][1])
        self.assertEqual(len(assignments), 1)
        self.assertIsInstance(assignments[0], ContentAssignment)
        self.assertEqual(assignments[0].contentnode_id, resources[0]["contentnode_id"])
        self.assertEqual(assignments[0].source_id, lesson.id)
        self.assertEqual(assignments[0].source_model, Lesson.morango_model_name)
        self.assertEqual(
            assignments[0].metadata,
            {
                "channel_id": resources[0]["channel_id"],
            },
        )

    def test_on_removable_assignment__lesson(self):
        callable_mock = mock.MagicMock()
        ContentAssignmentManager.on_any_removable_assignment(callable_mock)

        resources = [
            {
                "contentnode_id": uuid.uuid4().hex,
                "content_id": uuid.uuid4().hex,
                "channel_id": uuid.uuid4().hex,
            }
        ]

        lesson = Lesson(
            title="My Lesson",
            collection=self.classroom,
            created_by=self.admin_user,
            is_active=True,
            resources=resources,
        )
        lesson.save()
        callable_mock.assert_not_called()

        lesson.is_active = False
        lesson.save()
        callable_mock.assert_called_once()
        self.assertEqual(callable_mock.call_args[0][0], self.facility.dataset_id)
        assignments = list(callable_mock.call_args[0][1])
        self.assertEqual(len(assignments), 1)
        self.assertIsInstance(assignments[0], ContentAssignment)
        self.assertEqual(assignments[0].contentnode_id, resources[0]["contentnode_id"])
        self.assertEqual(assignments[0].source_id, lesson.id)
        self.assertEqual(assignments[0].source_model, Lesson.morango_model_name)
        self.assertEqual(
            assignments[0].metadata,
            {
                "channel_id": resources[0]["channel_id"],
            },
        )

    def test_on_removable_assignment__lesson__deletion(self):
        callable_mock = mock.MagicMock()
        ContentAssignmentManager.on_any_removable_assignment(callable_mock)

        resources = [
            {
                "contentnode_id": uuid.uuid4().hex,
                "content_id": uuid.uuid4().hex,
                "channel_id": uuid.uuid4().hex,
            }
        ]

        lesson = Lesson(
            title="My Lesson",
            collection=self.classroom,
            created_by=self.admin_user,
            is_active=True,
            resources=resources,
        )
        lesson.save()
        callable_mock.assert_not_called()

        pk = lesson.pk
        lesson.delete()
        callable_mock.assert_called_once()

        self.assertEqual(callable_mock.call_args[0][0], self.facility.dataset_id)
        assignments = list(callable_mock.call_args[0][1])
        self.assertEqual(len(assignments), 1)
        self.assertIsInstance(assignments[0], DeletedAssignment)
        self.assertEqual(assignments[0].source_id, pk)
        self.assertEqual(assignments[0].source_model, Lesson.morango_model_name)

    def test_on_downloadable_assignment__individual_syncable_lesson(self):
        callable_mock = mock.MagicMock()
        IndividualSyncableLesson.content_assignments.on_downloadable_assignment(
            callable_mock
        )

        resources = [
            {
                "contentnode_id": uuid.uuid4().hex,
                "content_id": uuid.uuid4().hex,
                "channel_id": uuid.uuid4().hex,
            }
        ]

        lesson = Lesson(
            title="My Lesson",
            collection=self.classroom,
            created_by=self.admin_user,
            is_active=True,
            resources=resources,
        )
        lesson.save()
        callable_mock.assert_not_called()

        syncable_lesson = IndividualSyncableLesson(
            user=self.learner,
            collection=self.classroom,
            lesson_id=lesson.pk,
            serialized_lesson=IndividualSyncableLesson.serialize_lesson(lesson),
        )
        syncable_lesson.save()

        callable_mock.assert_called_once()
        self.assertEqual(callable_mock.call_args[0][0], self.facility.dataset_id)
        assignments = list(callable_mock.call_args[0][1])
        self.assertEqual(len(assignments), 1)
        self.assertIsInstance(assignments[0], ContentAssignment)
        self.assertEqual(assignments[0].contentnode_id, resources[0]["contentnode_id"])
        self.assertEqual(assignments[0].source_id, syncable_lesson.id)
        self.assertEqual(
            assignments[0].source_model, IndividualSyncableLesson.morango_model_name
        )
        self.assertEqual(
            assignments[0].metadata,
            {
                "channel_id": resources[0]["channel_id"],
            },
        )

    def test_on_downloadable_assignment__exam(self):
        callable_mock = mock.MagicMock()
        Exam.content_assignments.on_downloadable_assignment(callable_mock)
        questions = [
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Test question Title 1",
                "counter_in_exercise": 0,
            }
        ]
        resources = [
            {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "questions": questions,
                "resource_pool": [],
                "question_count": len(questions),
                "learners_see_fixed_order": False,
            }
        ]

        exam = Exam(
            title="My Lesson",
            question_count=1,
            collection=self.classroom,
            creator=self.admin_user,
            active=False,
            question_sources=resources,
        )
        exam.save()
        callable_mock.assert_not_called()

        exam.active = True
        exam.save()

        callable_mock.assert_called_once()
        self.assertEqual(callable_mock.call_args[0][0], self.facility.dataset_id)
        assignments = list(callable_mock.call_args[0][1])
        self.assertEqual(len(assignments), 1)
        self.assertIsInstance(assignments[0], ContentAssignment)
        self.assertEqual(
            assignments[0].contentnode_id, resources[0]["questions"][0]["exercise_id"]
        )
        self.assertEqual(assignments[0].source_id, exam.id)
        self.assertEqual(assignments[0].source_model, Exam.morango_model_name)
        self.assertEqual(assignments[0].metadata, None)

    def test_on_downloadable_assignment__individual_syncable_exam(self):
        callable_mock = mock.MagicMock()
        IndividualSyncableExam.content_assignments.on_downloadable_assignment(
            callable_mock
        )
        questions = [
            {
                "exercise_id": uuid.uuid4().hex,
                "question_id": uuid.uuid4().hex,
                "title": "Test question Title 1",
                "counter_in_exercise": 0,
            }
        ]
        resources = [
            {
                "section_title": "Test Section Title",
                "description": "Test descripton for Section",
                "questions": questions,
                "resource_pool": [],
                "question_count": len(questions),
                "learners_see_fixed_order": False,
            }
        ]

        exam = Exam(
            title="My Lesson",
            question_count=1,
            collection=self.classroom,
            creator=self.admin_user,
            active=True,
            question_sources=resources,
        )
        exam.save()
        callable_mock.assert_not_called()

        syncable_exam = IndividualSyncableExam(
            user=self.learner,
            collection=self.classroom,
            exam_id=exam.pk,
            serialized_exam=IndividualSyncableExam.serialize_exam(exam),
        )
        syncable_exam.save()

        callable_mock.assert_called_once()
        self.assertEqual(callable_mock.call_args[0][0], self.facility.dataset_id)
        assignments = list(callable_mock.call_args[0][1])
        self.assertEqual(len(assignments), 1)
        self.assertIsInstance(assignments[0], ContentAssignment)
        self.assertEqual(
            assignments[0].contentnode_id, resources[0]["questions"][0]["exercise_id"]
        )
        self.assertEqual(assignments[0].source_id, syncable_exam.id)
        self.assertEqual(
            assignments[0].source_model, IndividualSyncableExam.morango_model_name
        )
        self.assertEqual(assignments[0].metadata, None)

    def _create_group(self, name, *members):
        group = LearnerGroup.objects.create(name=name, parent=self.classroom)
        for member in members:
            group.add_member(member)
        return group

    def _create_course_session(self, *collections):
        course_session = CourseSession.objects.create(
            title="My Course",
            collection=self.classroom,
            created_by=self.admin_user,
            is_active=True,
            course=uuid.uuid4().hex,
        )
        for collection in collections:
            CourseSessionAssignment.objects.create(
                course_session=course_session,
                collection=collection,
                assigned_by=self.admin_user,
            )
        return course_session

    def _assert_course_session_assignment(self, callable_mock, course_session):
        callable_mock.assert_called_once()
        self.assertEqual(callable_mock.call_args[0][0], self.facility.dataset_id)
        assignments = list(callable_mock.call_args[0][1])
        self.assertEqual(len(assignments), 1)
        self.assertIsInstance(assignments[0], ContentAssignment)
        self.assertEqual(assignments[0].contentnode_id, course_session.course)
        self.assertEqual(assignments[0].source_id, course_session.id)
        self.assertEqual(assignments[0].source_model, CourseSession.morango_model_name)
        self.assertEqual(assignments[0].metadata, {"import_descendants": True})

    def test_on_removable_assignment__course_session__no_assignments(self):
        course_session = self._create_course_session(self.classroom)

        callable_mock = mock.MagicMock()
        ContentAssignmentManager.on_any_removable_assignment(callable_mock)

        course_session.assignments.all().delete()
        course_session.save()

        self._assert_course_session_assignment(callable_mock, course_session)

    def test_on_removable_assignment__course_session__deactivated(self):
        course_session = self._create_course_session(self.classroom)

        callable_mock = mock.MagicMock()
        ContentAssignmentManager.on_any_removable_assignment(callable_mock)

        course_session.save()
        callable_mock.assert_not_called()

        course_session.is_active = False
        course_session.save()

        self._assert_course_session_assignment(callable_mock, course_session)

    def test_on_downloadable_assignment__course_session__multiple_assignments(self):
        course_session = self._create_course_session(
            self._create_group("Group A", self.learner),
            self._create_group("Group B", self.learner),
        )

        callable_mock = mock.MagicMock()
        ContentAssignmentManager.on_any_downloadable_assignment(callable_mock)

        course_session.save()

        self._assert_course_session_assignment(callable_mock, course_session)

    def test_on_downloadable_assignment__course_session__no_local_recipient(self):
        course_session = self._create_course_session(self._create_group("Group A"))

        callable_mock = mock.MagicMock()
        ContentAssignmentManager.on_any_downloadable_assignment(callable_mock)

        course_session.save()

        callable_mock.assert_not_called()

    def test_on_removable_assignment__course_session__recipient_removed(self):
        group = self._create_group("Group A", self.learner)
        course_session = self._create_course_session(group)

        callable_mock = mock.MagicMock()
        ContentAssignmentManager.on_any_removable_assignment(callable_mock)

        group.remove_member(self.learner)
        course_session.save()

        self._assert_course_session_assignment(callable_mock, course_session)


class FindDownloadableAssignmentsStoreFilterTestCase(TestCase):
    """
    Exercises the `Store` filtering that `find_downloadable_assignments` applies when scoped to a
    transfer session, against the database rather than a mocked queryset. The SQL semantics of the
    filter are the point here: `deserialization_error` is nullable, and morango writes NULL to it
    (via `Store.unset_deserialization_error`) for records that deserialized cleanly, so a
    comparison against the empty string alone silently drops every valid record.
    """

    databases = "__all__"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        provision_device()
        cls.facility = Facility.objects.create(name="My Facility")
        cls.classroom = Classroom.objects.create(
            name="My Classroom", parent=cls.facility
        )
        cls.admin_user = FacilityUser.objects.create(
            username="admin", facility=cls.facility
        )

    def setUp(self):
        super().setUp()
        self.transfer_session_id = uuid.uuid4().hex

    def _create_lesson(self, is_active=True):
        """
        Creates a lesson with a single, uniquely identified resource
        """
        lesson = Lesson(
            title="My Lesson",
            collection=self.classroom,
            created_by=self.admin_user,
            is_active=is_active,
            resources=[
                {
                    "contentnode_id": uuid.uuid4().hex,
                    "content_id": uuid.uuid4().hex,
                    "channel_id": uuid.uuid4().hex,
                }
            ],
        )
        lesson.save()
        return lesson

    def _create_store(self, lesson, **overrides):
        """
        Creates the `Store` record that a sync would have written for `lesson`
        """
        defaults = {
            "id": lesson.id,
            "profile": PROFILE_FACILITY_DATA,
            "serialized": "",
            "deleted": False,
            "hard_deleted": False,
            "last_saved_instance": uuid.uuid4().hex,
            "last_saved_counter": 1,
            "partition": f"{self.facility.dataset_id}:allusers-ro",
            "source_id": lesson.id,
            "model_name": Lesson.morango_model_name,
            # morango nulls this field out when deserialization succeeds
            "deserialization_error": None,
            "last_transfer_session_id": self.transfer_session_id,
        }
        defaults.update(overrides)
        return Store.objects.create(**defaults)

    def _downloadable_source_ids(self):
        return {
            assignment.source_id
            for assignment in Lesson.content_assignments.find_downloadable_assignments(
                transfer_session_id=self.transfer_session_id
            )
        }

    def test_deserialized_without_error(self):
        lesson = self._create_lesson()
        self._create_store(lesson)
        self.assertEqual(self._downloadable_source_ids(), {lesson.id})

    def test_deserialization_error_is_blank(self):
        lesson = self._create_lesson()
        self._create_store(lesson, deserialization_error="")
        self.assertEqual(self._downloadable_source_ids(), {lesson.id})

    def test_deserialization_error_is_set(self):
        lesson = self._create_lesson()
        self._create_store(lesson, deserialization_error="UNIQUE constraint failed")
        self.assertEqual(self._downloadable_source_ids(), set())

    def test_deleted(self):
        lesson = self._create_lesson()
        self._create_store(lesson, deleted=True)
        self.assertEqual(self._downloadable_source_ids(), set())

    def test_hard_deleted(self):
        lesson = self._create_lesson()
        self._create_store(lesson, hard_deleted=True)
        self.assertEqual(self._downloadable_source_ids(), set())

    def test_other_transfer_session(self):
        lesson = self._create_lesson()
        self._create_store(lesson, last_transfer_session_id=uuid.uuid4().hex)
        self.assertEqual(self._downloadable_source_ids(), set())

    def test_other_model_name(self):
        lesson = self._create_lesson()
        self._create_store(lesson, model_name=Exam.morango_model_name)
        self.assertEqual(self._downloadable_source_ids(), set())

    def test_model_filters_still_apply(self):
        lesson = self._create_lesson(is_active=False)
        self._create_store(lesson)
        self.assertEqual(self._downloadable_source_ids(), set())

    def test_only_valid_records_of_a_mixed_transfer_session(self):
        clean = self._create_lesson()
        self._create_store(clean)
        blank_error = self._create_lesson()
        self._create_store(blank_error, deserialization_error="")

        errored = self._create_lesson()
        self._create_store(errored, deserialization_error="ValidationError")
        deleted = self._create_lesson()
        self._create_store(deleted, deleted=True)
        hard_deleted = self._create_lesson()
        self._create_store(hard_deleted, hard_deleted=True)
        inactive = self._create_lesson(is_active=False)
        self._create_store(inactive)

        self.assertEqual(self._downloadable_source_ids(), {clean.id, blank_error.id})


class CourseSessionRecipientChangeTestCase(TestCase):
    """
    A learner joining or leaving a collection a course session is assigned to, or a collection
    deleted with its assignment rows, never writes the session row, so the sync that carries it
    leaves no `Store` record for `coursesession` to scan.
    """

    databases = "__all__"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        provision_device()
        cls.facility = Facility.objects.create(name="My Facility")
        cls.classroom = Classroom.objects.create(
            name="My Classroom", parent=cls.facility
        )
        cls.admin_user = FacilityUser.objects.create(
            username="admin", facility=cls.facility
        )
        cls.learner = FacilityUser.objects.create(
            username="learner", facility=cls.facility
        )
        cls.classroom.add_member(cls.learner)

    def setUp(self):
        super().setUp()
        self.transfer_session_id = uuid.uuid4().hex
        self.group = LearnerGroup.objects.create(name="My Group", parent=self.classroom)
        self.course_session = CourseSession.objects.create(
            title="My Course",
            collection=self.classroom,
            created_by=self.admin_user,
            is_active=True,
            course=uuid.uuid4().hex,
        )
        CourseSessionAssignment.objects.create(
            course_session=self.course_session,
            collection=self.group,
            assigned_by=self.admin_user,
        )

    def _create_store(self, model_name, source_id, partition, **overrides):
        """
        Creates the `Store` record that a sync would have written for a record of `model_name`
        """
        defaults = {
            "id": uuid.uuid4().hex,
            "profile": PROFILE_FACILITY_DATA,
            "serialized": "",
            "deleted": False,
            "hard_deleted": False,
            "last_saved_instance": uuid.uuid4().hex,
            "last_saved_counter": 1,
            "partition": partition,
            "source_id": source_id,
            "model_name": model_name,
            "deserialization_error": None,
            "last_transfer_session_id": self.transfer_session_id,
        }
        defaults.update(overrides)
        return Store.objects.create(**defaults)

    def _create_membership_store(self, collection, **overrides):
        membership = Membership(
            user=self.learner,
            collection=collection,
            dataset_id=self.facility.dataset_id,
        )
        return self._create_store(
            Membership.morango_model_name,
            membership.calculate_source_id(),
            membership.calculate_partition(),
            **overrides,
        )

    def _create_assignment_store(self, collection, **overrides):
        assignment = CourseSessionAssignment(
            course_session=self.course_session,
            collection=collection,
            dataset_id=self.facility.dataset_id,
        )
        return self._create_store(
            CourseSessionAssignment.morango_model_name,
            assignment.calculate_source_id(),
            assignment.calculate_partition(),
            **overrides,
        )

    def _downloadable_source_ids(self):
        return {
            assignment.source_id
            for assignment in CourseSession.content_assignments.find_downloadable_assignments(
                transfer_session_id=self.transfer_session_id
            )
        }

    def _removable_source_ids(self):
        return {
            assignment.source_id
            for assignment in CourseSession.content_assignments.find_removable_assignments(
                transfer_session_id=self.transfer_session_id
            )
        }

    def test_recipient_added(self):
        self.group.add_member(self.learner)
        self._create_membership_store(self.group)
        self.assertEqual(self._downloadable_source_ids(), {self.course_session.id})
        self.assertEqual(self._removable_source_ids(), set())

    def test_recipient_removed(self):
        self._create_membership_store(self.group, deleted=True)
        self.assertEqual(self._removable_source_ids(), {self.course_session.id})
        self.assertEqual(self._downloadable_source_ids(), set())

    def test_membership_of_unassigned_collection(self):
        self._create_membership_store(self.classroom, deleted=True)
        self.assertEqual(self._removable_source_ids(), set())

    def test_other_transfer_session(self):
        self._create_membership_store(
            self.group, deleted=True, last_transfer_session_id=uuid.uuid4().hex
        )
        self.assertEqual(self._removable_source_ids(), set())

    def test_assignment_deleted_with_its_collection(self):
        # deleting the group cascades to the assignment row, so nothing local links the
        # session to the collection any more
        self._create_assignment_store(self.group, deleted=True)
        self.group.delete()
        self.assertEqual(self._removable_source_ids(), {self.course_session.id})
        self.assertEqual(self._downloadable_source_ids(), set())
