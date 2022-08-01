import mock
from morango.constants import capabilities
from morango.constants import transfer_stages
from morango.constants import transfer_statuses

from ...base import BaseTestCase
from kolibri_sync_extras_plugin.management.commands import sync_proceed_to
from kolibri_sync_extras_plugin.sync.context import BackgroundSessionContext


class SyncProceedToCommandTestCase(BaseTestCase):
    def setUp(self):
        super(SyncProceedToCommandTestCase, self).setUp()
        self.transfer_session.pk = "abc123"

        transfer_session_patcher = mock.patch.object(
            sync_proceed_to.TransferSession, "objects"
        )
        self.objects_mock = transfer_session_patcher.start()
        self.addCleanup(transfer_session_patcher.stop)

        self.objects_mock.defer.return_value.get.return_value = self.transfer_session

        session_controller_patcher = mock.patch.object(
            sync_proceed_to, "session_controller"
        )
        self.session_controller_mock = session_controller_patcher.start()
        self.addCleanup(session_controller_patcher.stop)

        self.cmd = sync_proceed_to.Command()

    def test_pass__async_capable(self):
        self.session_controller_mock.proceed_to.return_value = (
            transfer_statuses.COMPLETED
        )
        self.cmd.handle(
            id="abc123",
            target_stage=transfer_stages.CLEANUP,
            capabilities=[capabilities.ASYNC_OPERATIONS],
        )
        self.objects_mock.defer.return_value.get.assert_called_once_with(pk="abc123")

        proceed_to_call = self.session_controller_mock.proceed_to.call_args_list[0][1]
        context = proceed_to_call.get("context")
        self.assertIsInstance(context, BackgroundSessionContext)
        self.assertEqual(proceed_to_call.get("target_stage"), transfer_stages.CLEANUP)
        self.assertEqual(context.transfer_session, self.transfer_session)
        self.assertTrue(context.is_push)
        self.assertEqual(context.capabilities, {capabilities.ASYNC_OPERATIONS})

    def test_failure__errored(self):
        def _proceed_to(target_stage=None, context=None):
            context.error = RuntimeError("test")
            return transfer_statuses.ERRORED

        self.session_controller_mock.proceed_to.side_effect = _proceed_to

        with self.assertRaisesRegex(
            sync_proceed_to.SyncProceedToError, "Failed to finalize"
        ):
            self.cmd.handle(
                id="abc123",
                target_stage=transfer_stages.CLEANUP,
                capabilities=[capabilities.ASYNC_OPERATIONS],
            )

    def test_failure__retried(self):
        self.session_controller_mock.proceed_to.side_effect = [
            transfer_statuses.PENDING
        ] * 5

        with self.assertRaisesRegex(
            sync_proceed_to.SyncProceedToError, "Exceeded retry"
        ):
            self.cmd.handle(
                id="abc123",
                target_stage=transfer_stages.CLEANUP,
                capabilities=[capabilities.ASYNC_OPERATIONS],
            )
