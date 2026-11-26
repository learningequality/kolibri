from django.db.models import Count
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import Sum

from kolibri.core.logger.evaluation import LATEST_ATTEMPT_ORDER_BY
from kolibri.core.logger.models import AttemptLog

LATEST_ITEM_ATTEMPT = Subquery(
    AttemptLog.objects.filter(masterylog=OuterRef("masterylog"), item=OuterRef("item"))
    .order_by(*LATEST_ATTEMPT_ORDER_BY)
    .values("id")[:1]
)


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
        num_correct=Subquery(
            try_attempts.filter(id=LATEST_ITEM_ATTEMPT)
            .annotate(total_correct=Sum("correct"))
            .values("total_correct")
        ),
    )
