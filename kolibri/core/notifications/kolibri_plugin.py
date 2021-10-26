from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.notifications.api import batch_process_attemptlogs
from kolibri.core.notifications.api import batch_process_examlogs
from kolibri.core.notifications.api import batch_process_summarylogs
from kolibri.plugins.hooks import register_hook


@register_hook
class NotificationsSyncHook(FacilityDataSyncHook):
    def post_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        """
        Generates notifications at cleanup stage (the end) of a transfer, if our instance was a
        "receiver" meaning we have received data
        """
        # if we've just received data on a single-user device, update the exams and assignments
        if context.is_receiver:
            batch_process_attemptlogs(
                context.transfer_session.get_touched_record_ids_for_model(AttemptLog)
            )
            batch_process_examlogs(
                context.transfer_session.get_touched_record_ids_for_model(ExamLog),
                context.transfer_session.get_touched_record_ids_for_model(
                    ExamAttemptLog
                ),
            )
            batch_process_summarylogs(
                context.transfer_session.get_touched_record_ids_for_model(
                    ContentSummaryLog
                )
            )
