"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.utils.exam_log_migration import migrate_from_exam_logs
from kolibri.core.notifications.api import parse_summarylog
from kolibri.core.notifications.api import quiz_completed_notification
from kolibri.core.upgrade import version_upgrade


@version_upgrade(old_version="<0.15.0")
def migrate_examlog_and_examattemptlogs():
    """
    Migrate all existing examlogs and examattemptlogs to our regular logging
    data structures.
    """
    migrate_from_exam_logs(ExamLog.objects.all())


@version_upgrade(old_version="<0.15.11")
def fix_asymptotic_progress():
    """
    Migrate any ContentSummaryLogs that have erroneously had their progress set to >0.999 but not to 1
    """
    for summarylog in ContentSummaryLog.objects.filter(
        progress__gt=0.999, progress__lt=1
    ):
        # Do this in a for loop rather than trying to minimize write queries, as it's a one time event
        # and the queries for finding any correlated mastery log would be quite complex joins.
        summarylog.progress = 1
        summarylog.completion_timestamp = summarylog.end_timestamp
        masterylog = summarylog.masterylogs.all().order_by("-end_timestamp").first()
        quiz = False
        if masterylog:
            masterylog.complete = True
            masterylog.completion_timestamp = masterylog.end_timestamp
            masterylog.save()
            if masterylog.mastery_level < 0:
                # This is a quiz, so we need to generate a quiz notification
                quiz_completed_notification(masterylog, summarylog.content_id)
                quiz = True
        summarylog.save()
        if not quiz:
            # If this isn't a quiz generate the appropriate completion notification for the resource.
            parse_summarylog(summarylog)
