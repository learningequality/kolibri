"""
A file to contain specific logic to handle version upgrades in Kolibri.
"""
from django.db.models import F
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Subquery

from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.models import ExamLog
from kolibri.core.logger.models import MasteryLog
from kolibri.core.logger.utils.attempt_log_consolidation import (
    consolidate_quiz_attempt_logs,
)
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


@version_upgrade(old_version="<0.16.0")
def fix_duplicated_attempt_logs():
    """
    Migrate any AttemptLogs for Quizzes and PracticeQuizzes that have been duplicated - i.e. have the same
    item and non-null masterylog_id.
    """
    consolidate_quiz_attempt_logs(AttemptLog.objects.all())


@version_upgrade(old_version=">0.15.0,<0.18.0")
def fix_masterylog_end_timestamps():
    """
    Fix any MasteryLogs that have an end_timestamp that was not updated after creation due to a bug in the
    integrated logging API endpoint.
    """
    # Fix the MasteryLogs that that have attempts - infer from the end_timestamp of the last attempt.
    attempt_subquery = (
        AttemptLog.objects.filter(masterylog=OuterRef("pk"))
        .values("masterylog")
        .annotate(max_end=Max("end_timestamp"))
        .values("max_end")
    )

    MasteryLog.objects.filter(
        end_timestamp=F("start_timestamp"), attemptlogs__isnull=False
    ).update(end_timestamp=Subquery(attempt_subquery))
    # Fix the MasteryLogs that don't have any attempts - just set the end_timestamp to the end_timestamp of the summary log.
    summary_subquery = ContentSummaryLog.objects.filter(
        masterylogs=OuterRef("pk")
    ).values("end_timestamp")

    MasteryLog.objects.filter(
        end_timestamp=F("start_timestamp"),
        completion_timestamp__isnull=True,
        attemptlogs__isnull=True,
    ).update(end_timestamp=Subquery(summary_subquery))
