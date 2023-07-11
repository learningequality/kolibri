import uuid

import mock
from django.test import TestCase

from kolibri.core.content.utils.assignment import ContentAssignment
from kolibri.core.content.utils.assignment import ContentAssignmentManager
from kolibri.core.content.utils.assignment import DeletedAssignment


_module = "kolibri.core.content.utils.assignment."


class ContentAssignmentManagerTestCase(TestCase):
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
