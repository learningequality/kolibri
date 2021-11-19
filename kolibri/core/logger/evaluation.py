from django.db.models import IntegerField
from django.db.models.aggregates import Sum
from django.db.models.expressions import CombinedExpression
from django.db.models.expressions import F
from django.db.models.expressions import OuterRef
from django.db.models.expressions import Subquery

from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import MasteryLog


def find_tries(content_id, user_id):
    """
    :param content_id: Reference to content or exam
    :type content_id: str|django.db.models.OuterRef
    :param user_id: A str referencing user.id
    :type user_id: str|django.db.models.OuterRef
    :return: A queryset representing the found tries
    :rtype: django.db.models.QuerySet
    """
    return MasteryLog.objects.filter(
        summarylog__content_id=content_id,
        user_id=user_id,
        complete=True,
    ).order_by("-completion_timestamp")


def get_try_for_user(content_id, user_id, try_index=0, **filters):
    """
    :param content_id: Reference to content or exam
    :type content_id: str|django.db.models.OuterRef
    :param user_id: Reference to user.id
    :type user_id: str|django.db.models.OuterRef
    :param try_index: The try index to find, 0 being most recent and counting up for older tries
    :type try_index: int
    :return: The try (MasteryLog) found for the parameters
    :rtype: MasteryLog
    """
    return (
        find_tries(content_id, user_id)
        .filter(**filters)[try_index : try_index + 1]
        .first()
    )


def get_previous_try(target_try):
    """
    :param target_try: The target mastery log to find the previous try
    :return: The previous try if any
    :rtype: MasteryLog
    """
    return get_try_for_user(
        target_try.summarylog.content_id,
        target_try.user_id,
        try_index=0,
        start_timestamp__lt=target_try.start_timestamp,
    )


def find_previous_tries(target_tries):
    """
    :param target_tries: A MasteryLog queryset
    :type target_tries: django.db.models.QuerySet
    :return: A queryset matching previous tries for each try in `target_tries`
    :rtype: django.db.models.QuerySet
    """
    previous_try_ids = target_tries.values(
        previous_try_id=Subquery(
            find_tries(OuterRef("summarylog__content_id"), OuterRef("user_id"))
            .filter(start_timestamp__lt=OuterRef("start_timestamp"))
            .values_list("id")[:1]
        )
    )
    return MasteryLog.objects.filter(id__in=previous_try_ids.distinct())


def find_previous_tries_attempts(target_try_attempts):
    """
    :param target_try_attempts: An AttemptLog queryset
    :type target_try_attempts: django.db.models.QuerySet
    :return: A queryset matching previous tries' attempts for each try in `target_try_attempts`
    :rtype: django.db.models.QuerySet
    """
    target_tries = MasteryLog.objects.filter(
        id__in=target_try_attempts.values_list("masterylog_id", flat=True).distinct(),
    )
    return AttemptLog.objects.filter(
        masterylog_id__in=find_previous_tries(target_tries).values_list("id"),
    ).order_by("-completion_timestamp")


def try_diff(target_try, previous_try=None):
    """
    :param target_try: A most recent try
    :type target_try: MasteryLog
    :param previous_try: A try prior to `target_try`
    :type previous_try: MasteryLog
    :return: A dict of differences, None if no previous try
    :rtype: dict|None
    """
    diff = None
    if previous_try:
        target_correct = target_try.attemptlogs.aggregate(correct=Sum("correct"))[
            "correct"
        ]
        previous_correct = previous_try.attemptlogs.aggregate(correct=Sum("correct"))[
            "correct"
        ]
        diff = {
            "correct": target_correct - previous_correct,
            "time_spent": target_try.time_spent - previous_try.time_spent,
        }
    return diff


def attempts_diff(target_try_attempts, previous_try_attempts):
    """
    Annotates a `diff_correct` with the question correct difference between current attempt and last attempt
        - diff = None: it was the first attempt (no diff)
        - diff = 0, correct = 0: incorrect previously and currently (no change)
        - diff = 0, correct = 1: correct previously and currently (no change)
        - diff = 1: incorrect previously, correct currently (improvement)
        - diff = -1: correct previously, incorrect currently (regression)

    :param target_try_attempts: An AttemptLog queryset of most recent attempts
    :type  target_try_attempts: django.db.models.QuerySet
    :param previous_try_attempts: An AttemptLog queryset of attempts prior
    :type  previous_try_attempts: django.db.models.QuerySet
    :return: A queryset annotated with `diff`
    :rtype: django.db.models.QuerySet
    """

    return target_try_attempts.annotate(
        diff__correct=CombinedExpression(
            F("correct"),
            "-",
            Subquery(
                previous_try_attempts.filter(
                    user_id=OuterRef("user_id"), item=OuterRef("item")
                ).values("correct")[:1],
                output_field=IntegerField(),
            ),
            output_field=IntegerField(),
        )
    )
