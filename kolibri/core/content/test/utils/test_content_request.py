import uuid

import mock
from django.test import TestCase

from kolibri.core.content.utils.content_request import synchronize_content_requests


_module = "kolibri.core.content.utils.content_request."


def _facility(dataset_id=None):
    return mock.MagicMock(id=uuid.uuid4().hex, dataset_id=dataset_id)


@mock.patch(_module + "Facility.objects.get", new=_facility)
class ContentRequestsTestCase(TestCase):
    def setUp(self):
        super(ContentRequestsTestCase, self).setUp()

        self.dataset_id = uuid.uuid4().hex
        self.transfer_session = mock.MagicMock()
        self.transfer_session.id = uuid.uuid4().hex

    @mock.patch(_module + "ContentAssignmentManager.find_all_removable_assignments")
    @mock.patch(_module + "ContentAssignmentManager.find_all_downloadable_assignments")
    def test_synchronize_content_requests__dataset_id_passthrough(
        self,
        find_all_downloadable_assignments_mock,
        find_all_removable_assignments_mock,
    ):
        find_all_downloadable_assignments_mock.return_value = []
        find_all_removable_assignments_mock.return_value = []

        synchronize_content_requests(self.dataset_id, None)
        find_all_downloadable_assignments_mock.assert_called_once_with(
            dataset_id=self.dataset_id
        )
        find_all_removable_assignments_mock.assert_called_once_with(
            dataset_id=self.dataset_id
        )

    @mock.patch(_module + "ContentAssignmentManager.find_all_removable_assignments")
    @mock.patch(_module + "ContentAssignmentManager.find_all_downloadable_assignments")
    def test_synchronize_content_requests__transfer_session_id_passthrough(
        self,
        find_all_downloadable_assignments_mock,
        find_all_removable_assignments_mock,
    ):
        find_all_downloadable_assignments_mock.return_value = []
        find_all_removable_assignments_mock.return_value = []

        synchronize_content_requests(
            self.dataset_id,
            transfer_session=self.transfer_session,
        )
        find_all_downloadable_assignments_mock.assert_called_once_with(
            transfer_session_id=self.transfer_session.id
        )
        find_all_removable_assignments_mock.assert_called_once_with(
            transfer_session_id=self.transfer_session.id
        )
