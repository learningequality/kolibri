import uuid

import mock
from django.test import TestCase
from morango.sync.context import LocalSessionContext

from .helpers import provision_device
from kolibri.core.auth.kolibri_plugin import AuthSyncHook
from kolibri.core.auth.kolibri_plugin import CleanUpTaskOperation


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


class AuthSyncHookTestCase(TestCase):
    def test_cleanup_operations(self):
        operation = AuthSyncHook().cleanup_operations[0]
        self.assertIsInstance(operation, CleanUpTaskOperation)
