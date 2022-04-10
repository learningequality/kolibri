from django.db.models import IntegerField
from django.db.models.expressions import CombinedExpression
from django.db.models.expressions import F
from django.db.models.expressions import OuterRef
from django.db.models.expressions import Subquery


LOG_ORDER_BY = F("end_timestamp").desc(nulls_last=True)


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
                previous_try_attempts.order_by(LOG_ORDER_BY)
                .filter(user_id=OuterRef("user_id"), item=OuterRef("item"))
                .values("correct")[:1],
                output_field=IntegerField(),
            ),
            output_field=IntegerField(),
        )
    )
