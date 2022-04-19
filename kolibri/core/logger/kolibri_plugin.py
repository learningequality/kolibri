import logging

from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.sync_operations import KolibriVersionedSyncOperation
from kolibri.core.logger.models import ExamAttemptLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.utils.exam_log_migration import migrate_from_exam_logs
from kolibri.plugins.hooks import register_hook


logger = logging.getLogger(__name__)


class ExamLogsCompatibilityOperation(KolibriVersionedSyncOperation):
    version = "0.15.0"

    def upgrade(self, context):
        """
        Migrates exam logs to be backwards compatible with older Kolibris
        :type context: morango.sync.context.LocalSessionContext
        """
        exam_logs_ids = context.transfer_session.get_touched_record_ids_for_model(
            ExamLog
        )
        exam_attempt_logs_ids = (
            context.transfer_session.get_touched_record_ids_for_model(ExamAttemptLog)
        )
        logger.info("Migrating {} ExamLogs records".format(len(exam_logs_ids)))
        migrate_from_exam_logs(
            ExamLog.objects.filter(id__in=exam_logs_ids),
            source_attempt_log_ids=exam_attempt_logs_ids,
        )


@register_hook
class LoggerSyncHook(FacilityDataSyncHook):
    cleanup_operations = [ExamLogsCompatibilityOperation()]
