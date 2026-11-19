from django.db.models import Count
from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery

from kolibri.core.logger.models import AttemptLog


class _LatestCorrectItemCount(Subquery):
    template = (
        "(SELECT CASE WHEN COUNT(*) = 0 THEN NULL"
        " ELSE COUNT(CASE WHEN latest_correct = latest THEN 1 END) END"
        " FROM (%(subquery)s) AS latest_items)"
    )
    output_field = IntegerField()


def annotate_response_summary(queryset):
    """
    Accepts a MasteryLog queryset as the only argument.
    Returns a queryset that has num_correct and num_answered
    annotations on the queryset.
    """
    try_attempts = (
        AttemptLog.objects.filter(masterylog=OuterRef("id"))
        .order_by()
        .values("masterylog")
    )
    return queryset.annotate(
        num_answered=Subquery(
            try_attempts.annotate(total_answered=Count("item", distinct=True)).values(
                "total_answered"
            )
        ),
        num_correct=_LatestCorrectItemCount(
            try_attempts.values("item")
            .annotate(
                latest=Max("end_timestamp"),
                latest_correct=Max("end_timestamp", filter=Q(correct=1)),
            )
            .values("latest", "latest_correct")
        ),
    )
