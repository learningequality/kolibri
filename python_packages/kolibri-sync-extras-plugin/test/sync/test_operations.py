import mock
from kolibri.core.tasks.job import State
from morango.constants import capabilities
from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.errors import MorangoSkipOperation

from ..base import BaseTestCase
from kolibri_sync_extras_plugin.sync.operations import BackgroundFinalizeJobOperation
from kolibri_sync_extras_plugin.sync.operations import BackgroundInitializeJobOperation
from kolibri_sync_extras_plugin.sync.operations import BackgroundJobOperation
from kolibri_sync_extras_plugin.sync.operations import BackgroundSessionContext
from kolibri_sync_extras_plugin.sync.operations import SyncExtrasLocalOperation


class SyncExtrasLocalOperationTestCase(BaseTestCase):
    def setUp(self):
        super(SyncExtrasLocalOperationTestCase, self).setUp()
        self.operation = SyncExtrasLocalOperation()

    @mock.patch("kolibri_sync_extras_plugin.sync.operations.OPTIONS")
    def test_option_stages__no_options(self, mock_options):
        mock_options.get.return_value = None
        self.assertEqual([], self.operation.option_stages)

    @mock.patch("kolibri_sync_extras_plugin.sync.operations.OPTIONS")
    def test_option_stages__not_enabled(self, mock_options):
        self.operation.option_condition = "BACKGROUND_FINALIZATION"
        mock_options.get.return_value = {}
        self.assertEqual([], self.operation.option_stages)
        mock_options.get.return_value = {"BACKGROUND_FINALIZATION": False}
        self.assertEqual([], self.operation.option_stages)

    @mock.patch("kolibri_sync_extras_plugin.sync.operations.OPTIONS")
    def test_option_stages__enabled__no_stages(self, mock_options):
        self.operation.option_condition = "BACKGROUND_FINALIZATION"
        mock_options.get.return_value = {"BACKGROUND_FINALIZATION": True}
        self.assertEqual([], self.operation.option_stages)

    @mock.patch("kolibri_sync_extras_plugin.sync.operations.OPTIONS")
    def test_option_stages__enabled(self, mock_options):
        self.operation.option_condition = "BACKGROUND_FINALIZATION"
        mock_options.get.return_value = {
            "BACKGROUND_FINALIZATION": True,
            "BACKGROUND_FINALIZATION_STAGES": "test1,test2",
        }
        self.assertEqual(["test1", "test2"], self.operation.option_stages)


class BackgroundJobOperationTestCase(BaseTestCase):
    @mock.patch("kolibri_sync_extras_plugin.sync.operations.set_job_id")
    @mock.patch("kolibri_sync_extras_plugin.sync.operations.job_storage")
    @mock.patch("kolibri_sync_extras_plugin.sync.operations.get_job_id")
    def test_get_or_queue_job__new(
        self, mock_get_job_id, mock_job_storage, mock_set_job_id
    ):
        mock_get_job_id.return_value = None
        mock_job_storage.enqueue_job.return_value = "xyz789"
        self.context.sync_session.server_certificate.get_root.return_value.id = "123abc"

        operation = BackgroundJobOperation()
        self.assertEqual(
            State.QUEUED, operation._get_or_queue_job(self.context, "other")
        )
        mock_get_job_id.assert_called_once_with(self.context)
        mock_job_storage.get_job.assert_not_called()

        job = mock_job_storage.enqueue_job.call_args[0][0]
        self.assertEqual(job.args, ("sync_proceed_to",))
        self.assertEqual(
            job.kwargs,
            {
                "id": "def456",
                "target_stage": "other",
                "capabilities": [],
            },
        )
        self.assertEqual(
            job.extra_metadata, {"type": "SYNCPROCEEDTO", "dataset_id": "123abc"}
        )
        mock_set_job_id.assert_called_once_with(self.context, "xyz789")

    @mock.patch("kolibri_sync_extras_plugin.sync.operations.job_storage")
    @mock.patch("kolibri_sync_extras_plugin.sync.operations.get_job_id")
    def test_get_or_queue_job__exists(self, mock_get_job_id, mock_job_storage):
        mock_get_job_id.return_value = "xyz789"
        mock_job_storage.get_job.return_value.state = "testing"
        operation = BackgroundJobOperation()
        self.assertEqual("testing", operation._get_or_queue_job(self.context, "other"))
        mock_get_job_id.assert_called_once_with(self.context)
        mock_job_storage.get_job.assert_called_once_with("xyz789")

    def test_validate__pass(self):
        operation = BackgroundJobOperation()
        operation.should_handle(self.context)

    def test_validate__not_background(self):
        context = BackgroundSessionContext()
        operation = BackgroundJobOperation()
        with self.assertRaises(MorangoSkipOperation):
            operation.should_handle(context)


class BackgroundInitializeJobOperationTestCase(BaseTestCase):
    def setUp(self):
        super(BackgroundInitializeJobOperationTestCase, self).setUp()
        mock_options = mock.patch("kolibri_sync_extras_plugin.sync.operations.OPTIONS")
        self.mock_options = mock_options.start()
        self.addCleanup(mock_options.stop)

        self.mock_options.get.return_value = {
            "BACKGROUND_INITIALIZATION": True,
            "BACKGROUND_INITIALIZATION_STAGES": ",".join(
                [transfer_stages.SERIALIZING, transfer_stages.QUEUING]
            ),
        }

    def test_should_handle__is_producer(self):
        operation = BackgroundInitializeJobOperation()
        self.context.is_producer = False
        with self.assertRaises(MorangoSkipOperation):
            operation.handle(self.context)

    def test_should_handle__async_capability(self):
        operation = BackgroundInitializeJobOperation()
        self.context.is_producer = True
        self.context.is_push = False
        self.assertNotIn(capabilities.ASYNC_OPERATIONS, self.context.capabilities)
        with self.assertRaises(MorangoSkipOperation):
            operation.handle(self.context)

    def test_should_handle__stage(self):
        operation = BackgroundInitializeJobOperation()
        self.context.is_push = False
        self.context.capabilities = {capabilities.ASYNC_OPERATIONS}
        self.context.stage = transfer_stages.INITIALIZING
        with self.assertRaises(MorangoSkipOperation):
            operation.handle(self.context)
        self.context.stage = transfer_stages.TRANSFERRING
        with self.assertRaises(MorangoSkipOperation):
            operation.handle(self.context)

    def test_handle__completed(self):
        operation = BackgroundInitializeJobOperation()
        self.context.is_push = False
        self.context.capabilities = {capabilities.ASYNC_OPERATIONS}
        self.context.stage = transfer_stages.QUEUING

        with mock.patch.object(operation, "_get_or_queue_job") as mock_job:
            mock_job.return_value = State.COMPLETED
            self.assertEqual(
                transfer_statuses.COMPLETED, operation.handle(self.context)
            )
            mock_job.assert_called_once_with(self.context, self.context.stage)

    def test_handle__completed_incompletely(self):
        operation = BackgroundInitializeJobOperation()
        self.context.is_push = False
        self.context.capabilities = {capabilities.ASYNC_OPERATIONS}
        self.context.stage = transfer_stages.QUEUING

        with mock.patch.object(operation, "_get_or_queue_job") as mock_job:
            mock_job.return_value = State.CANCELED
            self.assertEqual(transfer_statuses.ERRORED, operation.handle(self.context))
            mock_job.assert_called_once_with(self.context, self.context.stage)

    def test_handle__started(self):
        operation = BackgroundInitializeJobOperation()
        self.context.is_push = False
        self.context.capabilities = {capabilities.ASYNC_OPERATIONS}
        self.context.stage = transfer_stages.QUEUING

        with mock.patch.object(operation, "_get_or_queue_job") as mock_job:
            mock_job.return_value = State.RUNNING
            self.assertEqual(transfer_statuses.PENDING, operation.handle(self.context))
            mock_job.assert_called_once_with(self.context, self.context.stage)


class BackgroundFinalizeJobOperationTestCase(BaseTestCase):
    def setUp(self):
        super(BackgroundFinalizeJobOperationTestCase, self).setUp()
        mock_options = mock.patch("kolibri_sync_extras_plugin.sync.operations.OPTIONS")
        self.mock_options = mock_options.start()
        self.addCleanup(mock_options.stop)

        self.mock_options.get.return_value = {
            "BACKGROUND_FINALIZATION": True,
            "BACKGROUND_FINALIZATION_STAGES": ",".join(
                [
                    transfer_stages.DEQUEUING,
                    transfer_stages.DESERIALIZING,
                    transfer_stages.CLEANUP,
                ]
            ),
        }

    def test_should_handle__is_receiver(self):
        operation = BackgroundFinalizeJobOperation()
        self.context.is_receiver = False
        with self.assertRaises(MorangoSkipOperation):
            operation.handle(self.context)

    def test_should_handle__stage(self):
        operation = BackgroundFinalizeJobOperation()
        self.context.is_receiver = True
        self.context.stage = transfer_stages.TRANSFERRING
        with self.assertRaises(MorangoSkipOperation):
            operation.handle(self.context)

    def test_handle__completed(self):
        operation = BackgroundFinalizeJobOperation()
        self.context.is_receiver = True
        self.context.stage = transfer_stages.DEQUEUING
        self.context.capabilities = {capabilities.ASYNC_OPERATIONS}

        with mock.patch.object(operation, "_get_or_queue_job") as mock_job:
            mock_job.return_value = State.COMPLETED
            self.assertEqual(
                transfer_statuses.COMPLETED, operation.handle(self.context)
            )
            mock_job.assert_called_once_with(self.context, self.context.stage)

    def test_handle__completed_incompletely(self):
        operation = BackgroundFinalizeJobOperation()
        self.context.is_receiver = True
        self.context.stage = transfer_stages.DEQUEUING
        self.context.capabilities = {capabilities.ASYNC_OPERATIONS}

        with mock.patch.object(operation, "_get_or_queue_job") as mock_job:
            mock_job.return_value = State.CANCELED
            self.assertEqual(transfer_statuses.ERRORED, operation.handle(self.context))
            mock_job.assert_called_once_with(self.context, self.context.stage)

    def test_handle__started(self):
        operation = BackgroundFinalizeJobOperation()
        self.context.is_receiver = True
        self.context.stage = transfer_stages.DEQUEUING
        self.context.capabilities = {capabilities.ASYNC_OPERATIONS}

        with mock.patch.object(operation, "_get_or_queue_job") as mock_job:
            mock_job.return_value = State.RUNNING
            self.assertEqual(transfer_statuses.PENDING, operation.handle(self.context))
            mock_job.assert_called_once_with(self.context, self.context.stage)
