import mock
from django.test import SimpleTestCase
from morango.sync.context import LocalSessionContext

from kolibri.core.auth.sync_event_hook_utils import _post_transfer_handler
from kolibri.core.auth.sync_event_hook_utils import _pre_transfer_handler


MODULE_NAME = "kolibri.core.auth.sync_event_hook_utils"


@mock.patch("kolibri.core.auth.sync_event_hook_utils.FacilityDataSyncHook")
class FacilityDataSyncHooksTestCase(SimpleTestCase):
    def setUp(self):
        super(FacilityDataSyncHooksTestCase, self).setUp()

        class TestHook(object):
            pre_transfer = mock.Mock()
            post_transfer = mock.Mock()

        self.hook = TestHook()
        self.context = mock.Mock(spec=LocalSessionContext())
        self.context.sync_session.server_certificate.get_root.return_value.id = "123"

    def test_pre_transfer(self, mock_hook_registry):
        mock_hook_registry.registered_hooks = [self.hook]
        self.hook.pre_transfer.assert_not_called()
        _pre_transfer_handler(self.context)
        self.hook.pre_transfer.assert_called_once_with(
            context=self.context,
            dataset_id="123",
            local_is_single_user=False,
            remote_is_single_user=False,
            single_user_id=None,
        )

    def test_pre_transfer__not_local(self, mock_hook_registry):
        context = mock.Mock()
        mock_hook_registry.registered_hooks = [self.hook]
        self.hook.pre_transfer.assert_not_called()
        _pre_transfer_handler(context)
        self.hook.pre_transfer.assert_not_called()

    @mock.patch("kolibri.core.auth.sync_event_hook_utils.logger")
    def test_pre_transfer__failure(self, mock_logger, mock_hook_registry):
        mock_hook_registry.registered_hooks = [self.hook]
        self.hook.pre_transfer.assert_not_called()
        self.hook.pre_transfer.side_effect = RuntimeError()
        _pre_transfer_handler(self.context)
        self.hook.pre_transfer.assert_called()
        mock_logger.error.assert_called_once_with(
            "TestHook.pre_transfer hook failed",
            exc_info=self.hook.pre_transfer.side_effect,
        )

    def test_pre_transfer__failure__logging(self, mock_hook_registry):
        mock_hook_registry.registered_hooks = [self.hook]
        self.hook.pre_transfer.assert_not_called()
        self.hook.pre_transfer.side_effect = RuntimeError()
        _pre_transfer_handler(self.context)
        self.hook.pre_transfer.assert_called()

    def test_post_transfer(self, mock_hook_registry):
        mock_hook_registry.registered_hooks = [self.hook]
        self.hook.post_transfer.assert_not_called()
        _post_transfer_handler(self.context)
        self.hook.post_transfer.assert_called_once_with(
            context=self.context,
            dataset_id="123",
            local_is_single_user=False,
            remote_is_single_user=False,
            single_user_id=None,
        )

    def test_post_transfer__not_local(self, mock_hook_registry):
        context = mock.Mock()
        mock_hook_registry.registered_hooks = [self.hook]
        self.hook.post_transfer.assert_not_called()
        _post_transfer_handler(context)
        self.hook.post_transfer.assert_not_called()

    @mock.patch("kolibri.core.auth.sync_event_hook_utils.logger")
    def test_post_transfer__failure(self, mock_logger, mock_hook_registry):
        mock_hook_registry.registered_hooks = [self.hook]
        self.hook.post_transfer.assert_not_called()
        self.hook.post_transfer.side_effect = RuntimeError()
        _post_transfer_handler(self.context)
        self.hook.post_transfer.assert_called()
        mock_logger.error.assert_called_once_with(
            "TestHook.post_transfer hook failed",
            exc_info=self.hook.post_transfer.side_effect,
        )

    def test_post_transfer__failure__logging(self, mock_hook_registry):
        mock_hook_registry.registered_hooks = [self.hook]
        self.hook.post_transfer.assert_not_called()
        self.hook.post_transfer.side_effect = RuntimeError()
        _post_transfer_handler(self.context)
        self.hook.post_transfer.assert_called()
