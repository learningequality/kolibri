import uuid

import mock
from django.test import TestCase
from django.utils.timezone import now
from morango.sync.context import LocalSessionContext

from kolibri.core.auth.kolibri_plugin import AuthSyncHook
from kolibri.core.auth.kolibri_plugin import CleanUpTaskOperation
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser

from .helpers import provision_device


@mock.patch("kolibri.core.auth.kolibri_plugin.cleanupsync")
class CleanUpTaskOperationTestCase(TestCase):
    def setUp(self):
        provision_device()
        self.context = mock.MagicMock(
            spec=LocalSessionContext(),
            filter=uuid.uuid4().hex,
            is_push=True,
            is_pull=False,
            sync_session=mock.MagicMock(
                spec="morango.sync.session.SyncSession",
                client_instance_id=uuid.uuid4(),
                server_instance_id=uuid.uuid4(),
            ),
        )
        self.operation = CleanUpTaskOperation()

    def test_handle_initial__not_receiver(self, mock_task):
        self.context.is_receiver = False
        result = self.operation.handle_initial(self.context)
        self.assertFalse(result)
        mock_task.enqueue.assert_not_called()

    def test_handle_initial__is_server(self, mock_task):
        self.context.is_receiver = True
        self.context.is_server = True
        result = self.operation.handle_initial(self.context)
        self.assertFalse(result)
        mock_task.enqueue.assert_called_once_with(
            kwargs=dict(
                pull=self.context.is_pull,
                push=self.context.is_push,
                sync_filter=str(self.context.filter),
                client_instance_id=self.context.sync_session.client_instance_id.hex,
            )
        )

    def test_handle_initial__not_server(self, mock_task):
        self.context.is_receiver = True
        self.context.is_server = False
        result = self.operation.handle_initial(self.context)
        self.assertFalse(result)
        mock_task.enqueue.assert_called_once_with(
            kwargs=dict(
                pull=self.context.is_pull,
                push=self.context.is_push,
                sync_filter=str(self.context.filter),
                server_instance_id=self.context.sync_session.server_instance_id.hex,
            )
        )


@mock.patch("kolibri.core.auth.kolibri_plugin.get_learner_count")
@mock.patch("kolibri.core.auth.kolibri_plugin.Session")
class AuthSyncHookSessionCleanupTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        provision_device()
        self.facility = Facility.objects.create(name="Test Facility")

        # Create properly mocked sync session and transfer session
        mock_cert = mock.MagicMock()
        mock_cert.get_root.return_value = mock.MagicMock(id=self.facility.dataset_id)

        mock_sync_session = mock.MagicMock()
        mock_sync_session.is_server = False
        mock_sync_session.server_certificate = mock_cert
        mock_sync_session.client_certificate = mock_cert

        self.mock_transfer_session = mock.MagicMock()

        self.context = mock.MagicMock(
            spec=LocalSessionContext(),
            sync_session=mock_sync_session,
            is_server=False,
            transfer_session=self.mock_transfer_session,
        )
        self.hook = AuthSyncHook()
        self.now = now()

    def test_post_transfer__not_receiver(self, mock_session, mock_learner_count):
        """Test that post_transfer does nothing when not receiving data"""
        self.context.is_receiver = False
        self.hook.post_transfer(
            dataset_id=self.facility.dataset_id,
            local_is_single_user=False,
            remote_is_single_user=False,
            single_user_id=None,
            context=self.context,
        )
        mock_session.delete_all_sessions.assert_not_called()

    def test_post_transfer__no_soft_deleted_users(
        self, mock_session, mock_learner_count
    ):
        """Test that post_transfer does nothing when there are no soft-deleted users"""
        self.context.is_receiver = True
        # Create a regular (non-deleted) user
        user = FacilityUser.objects.create(
            username="regular_user",
            facility=self.facility,
        )
        # Mock transfer session to return this user's ID
        self.mock_transfer_session.get_touched_record_ids_for_model.return_value = [
            user.id
        ]

        self.hook.post_transfer(
            dataset_id=self.facility.dataset_id,
            local_is_single_user=False,
            remote_is_single_user=False,
            single_user_id=None,
            context=self.context,
        )
        mock_session.delete_all_sessions.assert_not_called()

    def test_post_transfer__with_soft_deleted_users(
        self, mock_session, mock_learner_count
    ):
        """Test that post_transfer cleans up sessions for soft-deleted users"""
        self.context.is_receiver = True
        # Create soft-deleted users
        user1 = FacilityUser.objects.create(
            username="deleted_user1",
            facility=self.facility,
        )
        user2 = FacilityUser.objects.create(
            username="deleted_user2",
            facility=self.facility,
        )
        # Soft delete them using all_objects to bypass the default manager
        # and use a real datetime value instead of a mock
        FacilityUser.all_objects.filter(id__in=[user1.id, user2.id]).update(
            date_deleted=self.now
        )

        # Mock transfer session to return these users' IDs
        self.mock_transfer_session.get_touched_record_ids_for_model.return_value = [
            user1.id,
            user2.id,
        ]

        self.hook.post_transfer(
            dataset_id=self.facility.dataset_id,
            local_is_single_user=False,
            remote_is_single_user=False,
            single_user_id=None,
            context=self.context,
        )

        # Verify delete_all_sessions was called with the correct user IDs
        mock_session.delete_all_sessions.assert_called_once()
        call_args = mock_session.delete_all_sessions.call_args[0][0]
        self.assertEqual(set(call_args), {user1.id, user2.id})


class AuthSyncHookTestCase(TestCase):
    def test_cleanup_operations(self):
        operation = AuthSyncHook().cleanup_operations[0]
        self.assertIsInstance(operation, CleanUpTaskOperation)
