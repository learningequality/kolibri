from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.sync_event_hook_utils import get_other_side_kolibri_version
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.notifications.api import batch_process_attemptlogs
from kolibri.core.notifications.api import batch_process_examlogs
from kolibri.core.notifications.api import batch_process_masterylogs_for_quizzes
from kolibri.core.notifications.api import batch_process_summarylogs
from kolibri.core.upgrade import matches_version
from kolibri.plugins.hooks import register_hook
from kolibri.utils.version import truncate_version


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
        if context.is_receiver and not local_is_single_user:
            batch_process_summarylogs(
                context.transfer_session.get_touched_record_ids_for_model(
                    ContentSummaryLog
                )
            )
            batch_process_attemptlogs(
                context.transfer_session.get_touched_record_ids_for_model(AttemptLog)
            )

            # exam logs are deprecated beyond 0.15.0, but process them if syncing with version
            # pre-0.15.0
            remote_version = get_other_side_kolibri_version(context)
            if remote_version is None or matches_version(
                truncate_version(remote_version), "<0.15.0"
            ):
                batch_process_examlogs(
                    context.transfer_session.get_touched_record_ids_for_model(ExamLog),
                    context.transfer_session.get_touched_record_ids_for_model(
                        ExamAttemptLog
                    ),
                )
            else:
                batch_process_masterylogs_for_quizzes(
                    context.transfer_session.get_touched_record_ids_for_model(
                        MasteryLog
                    ),
                    context.transfer_session.get_touched_record_ids_for_model(
                        AttemptLog
                    ),
                )
