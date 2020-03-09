from django.db import connection
from django.db.models import Aggregate
from django.db.models import CharField
from django.db.models import IntegerField
from django.db.models import Subquery

try:
    from django.contrib.postgres.aggregates import ArrayAgg

    class NotNullArrayAgg(ArrayAgg):
        def convert_value(self, value, expression, connection, context):
            if not value:
                return []
            return filter(lambda x: x is not None, value)


except ImportError:
    NotNullArrayAgg = None


class SQCount(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT COUNT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class SQSum(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT SUM(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


class GroupConcat(Aggregate):
    template = "GROUP_CONCAT(%(field)s)"

    def convert_value(self, value, expression, connection, context):
        if not value:
            return []
        return value.split(",")


def annotate_array_aggregate(queryset, **kwargs):
    if connection.vendor == "postgresql" and NotNullArrayAgg is not None:
        return queryset.annotate(
            **{target: NotNullArrayAgg(source) for target, source in kwargs.items()}
        )
    # Call values on "pk" to insert a GROUP BY to ensure the GROUP CONCAT
    # is called by row and not across the entire queryset.
    return queryset.values("pk").annotate(
        **{
            target: GroupConcat(source, output_field=CharField())
            for target, source in kwargs.items()
        }
    )
