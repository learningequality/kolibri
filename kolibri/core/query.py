from django.db.models import Aggregate
from django.db.models import IntegerField
from django.db.models import Subquery

try:
    from django.contrib.postgres.aggregates import ArrayAgg
except ImportError:
    ArrayAgg = None


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
