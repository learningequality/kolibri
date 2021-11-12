import json

import mock
from django.test import SimpleTestCase
from morango.constants import transfer_statuses
from morango.sync.context import LocalSessionContext
from morango.sync.context import SessionContext
from morango.sync.operations import BaseOperation

from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.sync_operations import KolibriSingleUserSyncOperation
from kolibri.core.auth.sync_operations import KolibriSyncOperationMixin
from kolibri.core.auth.sync_operations import KolibriSyncOperations
from kolibri.core.auth.sync_operations import KolibriVersionedSyncOperation


class KolibriSyncOperationsTestCase(SimpleTestCase):
    def setUp(self):
        super(KolibriSyncOperationsTestCase, self).setUp()
        self.operation = KolibriSyncOperations()
        self.context = mock.Mock(spec_set=SessionContext)()

    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperations.get_operations"
    )
    def test_handle(self, mock_get_operations):
        mock_get_operations.return_value = []
        for i in range(2):
            other_operation = mock.MagicMock(spec_set=BaseOperation)()
            other_operation.return_value = False
            mock_get_operations.return_value.append(other_operation)

        result = self.operation.handle(self.context)
        self.assertFalse(result)
        mock_get_operations.assert_called_once_with(self.context)
        for other_operation in mock_get_operations.return_value:
            other_operation.assert_called_once_with(self.context)

    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperations.get_operations"
    )
    def test_handle__break(self, mock_get_operations):
        mock_get_operations.return_value = []
        for i in range(2):
            other_operation = mock.MagicMock(spec_set=BaseOperation)()
            if i == 0:
                other_operation.return_value = transfer_statuses.PENDING
            else:
                other_operation.return_value = False
            mock_get_operations.return_value.append(other_operation)

        result = self.operation.handle(self.context)
        self.assertEqual(transfer_statuses.PENDING, result)
        mock_get_operations.assert_called_once_with(self.context)

        mock_get_operations.return_value[0].assert_called_once_with(self.context)
        mock_get_operations.return_value[1].assert_not_called()

    @mock.patch("kolibri.core.auth.sync_operations.FacilityDataSyncHook")
    def test_get_operations(self, mock_hook):
        mock_operations = []
        mock_hook.registered_hooks = []
        for i in range(2):
            mock_other_hook = mock.Mock(spec_set=FacilityDataSyncHook)()
            mock_operation = mock.Mock(spec_set=BaseOperation)()
            mock_operations.append(mock_operation)
            mock_other_hook.get_sync_operations.return_value = [mock_operation]
            mock_hook.registered_hooks.append(mock_other_hook)

        result = self.operation.get_operations(self.context)
        self.assertEqual(mock_operations, result)

        for mock_other_hook in mock_hook.registered_hooks:
            mock_other_hook.get_sync_operations.assert_called_once_with(self.context)


class KolibriSyncOperationMixinTestCase(SimpleTestCase):
    def setUp(self):
        self.operation = KolibriSyncOperationMixin()
        self.handle_initial = mock.Mock()
        self.operation.handle_initial = self.handle_initial
        self.handle_subsequent = mock.Mock()
        self.operation.handle_subsequent = self.handle_subsequent
        self.context = mock.Mock(spec_set=SessionContext)()

    def test_history_key(self):
        self.assertEqual(KolibriSyncOperationMixin.__name__, self.operation.history_key)

    def test_get_storage(self):
        self.context.sync_session.extra_fields = '{"test":true}'
        result = self.operation._get_storage(self.context)
        self.assertEqual({"test": True}, result)
        self.context.sync_session.refresh_from_db.assert_called_once_with(
            fields=["extra_fields"]
        )

    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperationMixin._get_storage"
    )
    def test_update_storage(self, mock_get_storage):
        mock_get_storage.return_value = {"test": True}
        self.operation._update_storage(self.context, {"appended": 1})
        actual_json = json.loads(self.context.sync_session.extra_fields)
        self.assertEqual({"test": True, "appended": 1}, actual_json)
        self.context.sync_session.save.assert_called_once_with()

    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperationMixin._get_storage"
    )
    def test_has_handled(self, mock_get_storage):
        mock_get_storage.return_value = {"test": True}
        self.context.transfer_session.id = "abc123"
        self.context.stage = "transferring"
        self.assertFalse(self.operation.has_handled(self.context))
        mock_get_storage.return_value = {
            KolibriSyncOperationMixin.__name__: ["abc123:transferring"]
        }
        self.assertTrue(self.operation.has_handled(self.context))

    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperationMixin._update_storage"
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperationMixin._get_storage"
    )
    def test_mark_handled(self, mock_get_storage, mock_update_storage):
        mock_get_storage.return_value = {}
        self.context.transfer_session.id = "abc123"
        self.context.stage = "transferring"
        self.operation.mark_handled(self.context)
        mock_update_storage.assert_called_once_with(
            self.context, {KolibriSyncOperationMixin.__name__: ["abc123:transferring"]}
        )

    def test_handle__assert_has_transfer_session(self):
        self.context.transfer_session = None
        self.assertFalse(self.operation(self.context))
        self.handle_initial.assert_not_called()
        self.handle_subsequent.assert_not_called()

    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperationMixin.mark_handled"
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperationMixin.has_handled"
    )
    def test_handle__not_handled(self, mock_has_handled, mock_mark_handled):
        mock_has_handled.return_value = False
        self.handle_initial.return_value = transfer_statuses.PENDING
        self.assertEqual(transfer_statuses.PENDING, self.operation.handle(self.context))
        mock_has_handled.assert_called_once_with(self.context)
        mock_mark_handled.assert_called_once_with(self.context)
        self.handle_initial.assert_called_once_with(self.context)
        self.handle_subsequent.assert_not_called()

    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperationMixin.mark_handled"
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.KolibriSyncOperationMixin.has_handled"
    )
    def test_handle__handled(self, mock_has_handled, mock_mark_handled):
        mock_has_handled.return_value = True
        self.handle_subsequent.return_value = transfer_statuses.PENDING
        self.assertEqual(transfer_statuses.PENDING, self.operation.handle(self.context))
        mock_has_handled.assert_called_once_with(self.context)
        mock_mark_handled.assert_not_called()
        self.handle_subsequent.assert_called_once_with(self.context)
        self.handle_initial.assert_not_called()


class KolibriVersionedSyncOperationTestCase(SimpleTestCase):
    def setUp(self):
        super(KolibriVersionedSyncOperationTestCase, self).setUp()
        self.operation = KolibriVersionedSyncOperation()
        self.operation.version = "0.15.0"
        self.upgrade = mock.Mock()
        self.operation.upgrade = self.upgrade
        self.downgrade = mock.Mock()
        self.operation.downgrade = self.downgrade
        self.context = mock.Mock(spec_set=LocalSessionContext)()
        self.context.is_server = False
        self.context.sync_session.client_instance_data = {}
        self.context.sync_session.server_instance_data = {}
        self.context.sync_session.extra_fields = "{}"

    def test_handle__assert_version(self):
        self.operation.version = None
        with self.assertRaises(AssertionError):
            self.operation.handle(self.context)

    def test_handle__server__upgrade_not_needed(self):
        self.context.is_receiver = True
        self.context.is_server = True
        self.context.sync_session.client_instance_data = {
            "kolibri": self.operation.version,
        }
        self.assertFalse(self.operation.handle(self.context))
        self.upgrade.assert_not_called()
        self.downgrade.assert_not_called()

    def test_handle__server__downgrade_not_needed(self):
        self.context.is_receiver = False
        self.context.is_server = True
        self.context.sync_session.client_instance_data = {
            "kolibri": self.operation.version,
        }
        self.assertFalse(self.operation.handle(self.context))
        self.downgrade.assert_not_called()
        self.upgrade.assert_not_called()

    def test_handle__server__upgrade(self):
        self.context.is_receiver = True
        self.context.is_server = True
        self.context.sync_session.client_instance_data = {
            "kolibri": "0.14.7",
        }
        self.assertFalse(self.operation.handle(self.context))
        self.upgrade.assert_called_once_with(self.context)
        self.downgrade.assert_not_called()

    def test_handle__server__downgrade(self):
        self.context.is_receiver = False
        self.context.is_server = True
        self.context.sync_session.client_instance_data = {
            "kolibri": "0.14.7",
        }
        self.assertFalse(self.operation.handle(self.context))
        self.downgrade.assert_called_once_with(self.context)
        self.upgrade.assert_not_called()

    def test_handle__server__upgrade__no_info(self):
        self.context.is_receiver = True
        self.context.is_server = True
        self.assertFalse(self.operation.handle(self.context))
        self.upgrade.assert_called_once_with(self.context)
        self.downgrade.assert_not_called()

    def test_handle__server__downgrade__no_info(self):
        self.context.is_receiver = False
        self.context.is_server = True
        self.assertFalse(self.operation.handle(self.context))
        self.downgrade.assert_called_once_with(self.context)
        self.upgrade.assert_not_called()

    def test_handle__client__upgrade_not_needed(self):
        self.context.is_receiver = True
        self.context.sync_session.server_instance_data = {
            "kolibri": self.operation.version,
        }
        self.assertFalse(self.operation.handle(self.context))
        self.upgrade.assert_not_called()
        self.downgrade.assert_not_called()

    def test_handle__client__downgrade_not_needed(self):
        self.context.is_receiver = False
        self.context.sync_session.server_instance_data = {
            "kolibri": self.operation.version,
        }
        self.assertFalse(self.operation.handle(self.context))
        self.downgrade.assert_not_called()
        self.upgrade.assert_not_called()

    def test_handle__client__upgrade(self):
        self.context.is_receiver = True
        self.context.sync_session.server_instance_data = {
            "kolibri": "0.14.7",
        }
        self.assertFalse(self.operation.handle(self.context))
        self.upgrade.assert_called_once_with(self.context)
        self.downgrade.assert_not_called()

    def test_handle__client__downgrade(self):
        self.context.is_receiver = False
        self.context.sync_session.server_instance_data = {
            "kolibri": "0.14.7",
        }
        self.assertFalse(self.operation.handle(self.context))
        self.downgrade.assert_called_once_with(self.context)
        self.upgrade.assert_not_called()

    def test_handle__client__upgrade__no_info(self):
        self.context.is_receiver = True
        self.assertFalse(self.operation.handle(self.context))
        self.upgrade.assert_called_once_with(self.context)
        self.downgrade.assert_not_called()

    def test_handle__client__downgrade__no_info(self):
        self.context.is_receiver = False
        self.assertFalse(self.operation.handle(self.context))
        self.downgrade.assert_called_once_with(self.context)
        self.upgrade.assert_not_called()


@mock.patch("kolibri.core.auth.sync_operations.other_side_using_single_user_cert")
@mock.patch("kolibri.core.auth.sync_operations.this_side_using_single_user_cert")
class KolibriSingleUserSyncOperationTestCase(SimpleTestCase):
    def setUp(self):
        super(KolibriSingleUserSyncOperationTestCase, self).setUp()
        self.operation = KolibriSingleUserSyncOperation()
        self.handle_local_user = mock.Mock()
        self.operation.handle_local_user = self.handle_local_user
        self.handle_remote_user = mock.Mock()
        self.operation.handle_remote_user = self.handle_remote_user
        self.context = mock.Mock(spec_set=LocalSessionContext)()
        self.context.is_server = False
        self.context.sync_session.client_instance_data = {}
        self.context.sync_session.server_instance_data = {}
        self.context.sync_session.extra_fields = "{}"

    def test_handle_initial__assert_local_or_remote(
        self, mock_is_local, mock_is_remote
    ):
        mock_is_local.return_value = False
        mock_is_remote.return_value = False
        with self.assertRaises(AssertionError):
            self.assertFalse(self.operation.handle_initial(self.context))
        self.handle_local_user.assert_not_called()
        self.handle_remote_user.assert_not_called()

    def test_handle_initial__local(self, mock_is_local, mock_is_remote):
        mock_is_local.return_value = True
        mock_is_remote.return_value = False
        self.handle_local_user.return_value = transfer_statuses.PENDING

        with mock.patch(
            "kolibri.core.auth.sync_operations.get_user_id_for_single_user_sync"
        ) as mock_get_user_id:
            mock_get_user_id.return_value = "abc123"
            self.assertEqual(
                transfer_statuses.PENDING, self.operation.handle_initial(self.context)
            )
            mock_get_user_id.assert_called_once_with(self.context)

        self.handle_local_user.assert_called_once_with(self.context, "abc123")
        self.handle_remote_user.assert_not_called()

    def test_handle_initial__remote(self, mock_is_local, mock_is_remote):
        mock_is_local.return_value = False
        mock_is_remote.return_value = True
        self.handle_remote_user.return_value = transfer_statuses.PENDING

        with mock.patch(
            "kolibri.core.auth.sync_operations.get_user_id_for_single_user_sync"
        ) as mock_get_user_id:
            mock_get_user_id.return_value = "abc123"
            self.assertEqual(
                transfer_statuses.PENDING, self.operation.handle_initial(self.context)
            )
            mock_get_user_id.assert_called_once_with(self.context)

        self.handle_remote_user.assert_called_once_with(self.context, "abc123")
        self.handle_local_user.assert_not_called()
