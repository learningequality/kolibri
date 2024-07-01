import uuid

import mock
from django.test import TestCase

from kolibri.core.auth.models import Classroom
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.content.utils.assignment import ContentAssignment
from kolibri.core.content.utils.assignment import ContentAssignmentManager
from kolibri.core.content.utils.assignment import DeletedAssignment
from kolibri.core.exams.models import Exam
from kolibri.core.exams.models import IndividualSyncableExam
from kolibri.core.lessons.models import IndividualSyncableLesson
from kolibri.core.lessons.models import Lesson


_module = "kolibri.core.content.utils.assignment."


class ContentAssignmentManagerTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        super(ContentAssignmentManagerTestCase, self).setUp()

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
            qs.filter.return_value.filter.return_value
        )

    @mock.patch(_module + "ContentAssignmentManager._get_modified_store")
    @mock.patch(_module + "ContentAssignmentManager._get_assignments")
    def test_find_downloadable_assignments__transfer_session_id(
        self, get_assignments_mock, get_modified_store_mock
    ):
        store_qs = mock.MagicMock()
        get_modified_store_mock.return_value = store_qs
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
        exclude_q = store_qs.exclude.call_args[0][0]
        self.assertEqual(
            str(exclude_q),
            "(OR: ('deleted', True), ('hard_deleted', True), (NOT (AND: ('deserialization_error', ''))))",
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
        super(ContentAssignmentManagerIntegrationTestCase, cls).setUpClass()

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
