from django.db import connection
from django.db.models import Aggregate
from django.db.models import CharField
from django.db.models import IntegerField
from django.db.models import Subquery

try:
    from django.contrib.postgres.aggregates import ArrayAgg

    class NotNullArrayAgg(ArrayAgg):
        def __init__(self, *args, **kwargs):
            self.result_field = kwargs.pop("result_field", None)
            super(NotNullArrayAgg, self).__init__(*args, **kwargs)

        def convert_value(self, value, expression, connection, context):
            if not value:
                return []
            results = list(filter(lambda x: x is not None, value))
            if self.result_field is not None:
                return list(map(self.result_field.to_python, results))
            return results


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


class GroupConcatSubquery(Subquery):
    template = "(SELECT GROUP_CONCAT(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = CharField()

    def as_postgresql(self, compiler, connection):
        self.template = (
            "(SELECT STRING_AGG(%(field)s, ',') FROM (%(subquery)s) AS %(field)s__sum)"
        )
        return super(GroupConcatSubquery, self).as_sql(compiler, connection)


class GroupConcat(Aggregate):
    template = "GROUP_CONCAT(%(field)s)"
    output_field = CharField()

    def __init__(self, *args, **kwargs):
        self.result_field = kwargs.pop("result_field", None)
        super(GroupConcat, self).__init__(*args, **kwargs)

    def convert_value(self, value, expression, connection, context):
        if not value:
            return []
        results = value.split(",")
        if self.result_field is not None:
            return list(map(self.result_field.to_python, results))
        return results


def get_source_field(model, field_path):
    # Get the source field from the model so that we can properly coerce values
    # this is necessary when we are using GroupConcat to return non-string fields.
    paths = field_path.split("__")
    while len(paths) > 1:
        model = model._meta.get_field(paths.pop(0)).related_model
    field = model._meta.get_field(paths[0])
    if field.is_relation and field.foreign_related_fields:
        field = field.foreign_related_fields[0]
    return field


def annotate_array_aggregate(queryset, **kwargs):
    model = queryset.model
    if connection.vendor == "postgresql" and NotNullArrayAgg is not None:
        return queryset.annotate(
            **{
                target: NotNullArrayAgg(
                    source, result_field=get_source_field(model, source)
                )
                for target, source in kwargs.items()
            }
        )
    # Call values on "pk" to insert a GROUP BY to ensure the GROUP CONCAT
    # is called by row and not across the entire queryset.
    return queryset.values("pk").annotate(
        **{
            target: GroupConcat(source, result_field=get_source_field(model, source))
            for target, source in kwargs.items()
        }
    )
