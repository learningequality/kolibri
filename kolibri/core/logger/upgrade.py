"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.utils.exam_log_migration import migrate_from_exam_logs
from kolibri.core.upgrade import version_upgrade


@version_upgrade(old_version="<0.15.0")
def migrate_examlog_and_examattemptlogs():
    """
    Migrate all existing examlogs and examattemptlogs to our regular logging
    data structures.
    """
    migrate_from_exam_logs(ExamLog.objects.all())
