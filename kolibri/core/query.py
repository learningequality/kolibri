from django.db import connection
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


def process_uuid_aggregate(item, key):
    if connection.vendor == "postgresql" and ArrayAgg is not None:
        # Filter out null values
        return list(map(lambda x: x.hex, filter(lambda x: x, item[key])))
    return item[key].split(",") if item[key] else []
