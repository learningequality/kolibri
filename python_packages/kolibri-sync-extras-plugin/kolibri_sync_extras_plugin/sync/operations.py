import logging

from django.core.management import call_command
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import queue
from kolibri.utils.conf import OPTIONS
from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.constants.capabilities import ASYNC_OPERATIONS
from morango.sync.operations import LocalOperation

from kolibri_sync_extras_plugin.sync.context import BackgroundSessionContext
from kolibri_sync_extras_plugin.tasks import get_job_id
from kolibri_sync_extras_plugin.tasks import set_job_id


logger = logging.getLogger(__name__)


class SyncExtrasLocalOperation(LocalOperation):
    option_condition = None

    @property
    def option_stages(self):
        """
        :return: A list of transfer stages that the operation should handle
        :rtype: str[]
        """
        sync_options = OPTIONS.get("Sync", None)
        # ensure option setting is enabled
        if not sync_options or not sync_options.get(self.option_condition, False):
            return []
        # if option is enabled, check that stage is in option's stage list
        option_key = "{}_STAGES".format(self.option_condition)
        if not sync_options.get(option_key, None):
            return []
        return sync_options.get(option_key).split(",")

    def should_handle(self, context):
        """
        :type context: morango.sync.context.LocalSessionContext
        """
        self._assert(context.sync_session is not None)
        self._assert(context.transfer_session is not None)
        self._assert(context.filter is not None)

        if self.option_condition is not None:
            self._assert(context.stage in self.option_stages)


class BackgroundJobOperation(SyncExtrasLocalOperation):
    """
    Queues a task to perform sync stages in the background outside the request thread
    """

    def should_handle(self, context):
        """
        :type context: morango.sync.context.LocalSessionContext
        """
        super(BackgroundJobOperation, self).should_handle(context)
        # this check causes this operation to be skipped when in the background, and the default
        # operations take over
        self._assert(not isinstance(context, BackgroundSessionContext))

    def _get_or_queue_job(self, context, target_stage):
        # we'll keep track of the job in the sync session's extra fields
        job_id = get_job_id(context)

        # check the job state
        if job_id is not None:
            return queue.fetch_job(job_id).state

        # get certificate so we can attach the dataset_id
        cert = context.sync_session.client_certificate
        if context.is_server:
            cert = context.sync_session.server_certificate

        job_id = queue.enqueue(
            call_command,
            "sync_proceed_to",
            id=context.transfer_session.id,
            target_stage=target_stage,
            capabilities=list(context.capabilities),
            start_stage=context.stage,
            extra_metadata={
                "type": "SYNCPROCEEDTO",
                "dataset_id": cert.get_root().id,
            },
        )
        set_job_id(context, job_id)
        logger.info("Enqueued sync_proceed_to: {}".format(job_id))
        return State.QUEUED


class BackgroundInitializeJobOperation(BackgroundJobOperation):
    """
    Queues a task to perform serialization or queuing stage in the background outside the request
    thread, but only if the client supports async operations (Kolibri 0.15+)
    """

    option_condition = "BACKGROUND_INITIALIZATION"

    def handle(self, context):
        """
        :type context: morango.sync.context.LocalSessionContext
        """
        self.should_handle(context)
        self._assert(context.is_producer)
        # if the client doesn't support async, we simply can't process this in the background
        self._assert(ASYNC_OPERATIONS in context.capabilities)
        current_stage = transfer_stages.stage(context.stage)
        # the initialization stage itself cannot be processed in the background
        self._assert(
            current_stage > transfer_stages.stage(transfer_stages.INITIALIZING)
        )
        self._assert(
            current_stage < transfer_stages.stage(transfer_stages.TRANSFERRING)
        )

        job_state = self._get_or_queue_job(context, context.stage)

        # Return status of the job when in a finished state
        if job_state == State.COMPLETED:
            return transfer_statuses.COMPLETED
        if job_state in (State.FAILED, State.CANCELED):
            return transfer_statuses.ERRORED

        # returning PENDING will cause this operation to be called again, so we can then report on
        # the progress of the background job
        return transfer_statuses.PENDING


class BackgroundFinalizeJobOperation(BackgroundJobOperation):
    """
    Queues a task to perform finalize operations (dequeuing, deserialization or cleanup) in the
    background outside the request thread
    """

    option_condition = "BACKGROUND_FINALIZATION"

    def handle(self, context):
        """
        :type context: morango.sync.context.LocalSessionContext
        """
        self.should_handle(context)
        self._assert(context.is_receiver)
        self._assert(
            transfer_stages.stage(context.stage)
            > transfer_stages.stage(transfer_stages.TRANSFERRING)
        )

        # we'll jump straight to cleanup if in compatibility mode
        job_state = self._get_or_queue_job(context, context.stage)

        # Return status of the job when in a finished state
        if job_state == State.COMPLETED:
            return transfer_statuses.COMPLETED
        if job_state in (State.FAILED, State.CANCELED):
            return transfer_statuses.ERRORED

        # returning PENDING will cause this operation to be called again, so we can then report on
        # the progress of the background job
        return transfer_statuses.PENDING
