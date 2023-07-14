from django.db import transaction
from django.db.models import Count

from kolibri.core.logger.models import AttemptLog


def consolidate_quiz_attempt_logs(source_logs):
    """
    This function checks the attempt logs in the queryset passed in as the sole argument
    and ensures that they if they are associated with a masterylog and a quiz, that they are not duplicates
    with other attemptlogs for the same masterylog and the same item value.
    """
    source_logs = source_logs.filter(masterylog__mastery_level__lt=0)

    duplicates = (
        source_logs.values("user", "item", "masterylog")
        .annotate(count=Count("id"))
        .filter(count__gt=1)
    )

    for duplicate in duplicates:
        with transaction.atomic():
            duplicate_objects = AttemptLog.objects.filter(
                user=duplicate["user"],
                item=duplicate["item"],
                masterylog=duplicate["masterylog"],
                # For simplicity, we will keep the most recent attemptlog and consolidate the others into it
            ).order_by("-end_timestamp")
            attemptlog_to_keep = duplicate_objects[0]
            for attemptlog in duplicate_objects[1:]:
                if attemptlog_to_keep.start_timestamp > attemptlog.start_timestamp:
                    attemptlog_to_keep.start_timestamp = attemptlog.start_timestamp
                # Always prepend the interaction history to the attemptlog to keep
                # as we are keeping the answers for the most recent attempt, and want
                # to preserve the sequence of attempts leading up to that attempt.
                attemptlog_to_keep.interaction_history = (
                    attemptlog.interaction_history
                    + attemptlog_to_keep.interaction_history
                )
                attemptlog_to_keep.time_spent += attemptlog.time_spent
                attemptlog.delete()
            attemptlog_to_keep.save()
