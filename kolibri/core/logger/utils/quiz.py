from django.db.models import Count
from django.db.models import OuterRef
from django.db.models import Subquery
from django.db.models import Sum

from kolibri.core.logger.models import AttemptLog


def annotate_response_summary(queryset):
    """
    Accepts a MasteryLog queryset as the only argument.
    Returns a queryset that has num_correct and num_answered
    annotations on the queryset.

    Only useful for MasteryLogs generated for quizzes.
    """
    return queryset.annotate(
        num_correct=Subquery(
            AttemptLog.objects.filter(masterylog=OuterRef("id"))
            .order_by()
            .values_list("item")
            .distinct()
            .values("masterylog")
            .annotate(total_correct=Sum("correct"))
            .values("total_correct")
        ),
        num_answered=Subquery(
            AttemptLog.objects.filter(masterylog=OuterRef("id"))
            .order_by()
            .values_list("item")
            .distinct()
            .values("masterylog")
            .annotate(total_complete=Count("id"))
            .values("total_complete")
        ),
    )
