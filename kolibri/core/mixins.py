"""
Mixins for Django REST Framework ViewSets and Django Querysets
"""
import logging
from uuid import UUID

from django.core.exceptions import EmptyResultSet
from django.db.models import ForeignKey
from django.db.models import QuerySet
from django.db.models.fields import CharField
from django.db.models.lookups import In
from morango.models import UUIDField
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class BulkCreateMixin(object):
    def get_serializer(self, *args, **kwargs):
        """ if an array is passed, set serializer to many """
        if isinstance(kwargs.get("data", {}), list):
            kwargs["many"] = True
        return super(BulkCreateMixin, self).get_serializer(*args, **kwargs)


class BulkDeleteMixin(object):

    # Taken from https://github.com/miki725/django-rest-framework-bulk

    def allow_bulk_destroy(self, qs, filtered):
        """
        Hook to ensure that the bulk destroy should be allowed.
        By default this checks that the destroy is only applied to
        filtered querysets.
        """
        # Only let a bulk destroy if the queryset is being filtered by a valid filter_field parameter
        return any(
            key in self.filter_fields for key in self.request.query_params.keys()
        )

    def bulk_destroy(self, request, *args, **kwargs):
        qs = self.get_queryset()

        filtered = self.filter_queryset(qs)
        if not self.allow_bulk_destroy(qs, filtered):
            return Response(status=status.HTTP_400_BAD_REQUEST)

        self.perform_bulk_destroy(filtered)

        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        instance.delete()

    def perform_bulk_destroy(self, objects):
        for obj in objects:
            self.perform_destroy(obj)


class UUIDIn(In):
    lookup_name = "uuidin"

    # Modified from:
    # https://github.com/django/django/blob/stable/1.11.x/django/db/models/lookups.py#L346

    def process_rhs(self, compiler, connection):
        db_rhs = getattr(self.rhs, "_db", None)
        if db_rhs is not None and db_rhs != connection.alias:
            raise ValueError(
                "Subqueries aren't allowed across different databases. Force "
                "the inner query to be evaluated using `list(inner_query)`."
            )

        if self.rhs_is_direct_value():
            try:
                rhs = set(self.rhs)
            except TypeError:  # Unhashable items in self.rhs
                rhs = self.rhs

            if not rhs:
                raise EmptyResultSet

            # rhs should be an iterable; use batch_process_rhs() to
            # prepare/transform those values.
            sqls, sqls_params = self.batch_process_rhs(compiler, connection, rhs)
            placeholder = "(" + ",".join("'{}'".format(p) for p in sqls_params) + ")"
            sqls_params = ()
            return (placeholder, sqls_params)
        else:
            return super(UUIDIn, self).process_rhs(compiler, connection)

    def split_parameter_list_as_sql(self, compiler, connection):
        # This is a special case for databases which limit the number of
        # elements which can appear in an 'IN' clause.
        max_in_list_size = connection.ops.max_in_list_size()
        lhs, lhs_params = self.process_lhs(compiler, connection)
        rhs, rhs_params = self.batch_process_rhs(compiler, connection)
        in_clause_elements = ["("]
        params = []
        for offset in range(0, len(rhs_params), max_in_list_size):
            if offset > 0:
                in_clause_elements.append(" OR ")
            in_clause_elements.append("%s IN (" % lhs)
            params.extend(lhs_params)
            sqls_params = ()
            param_group = (
                "("
                + ",".join(
                    "'{}'".format(p)
                    for p in rhs_params[offset : offset + max_in_list_size]
                )
                + ")"
            )
            in_clause_elements.append(param_group)
            in_clause_elements.append(")")
            params.extend(sqls_params)
        in_clause_elements.append(")")
        return "".join(in_clause_elements), params


UUIDField.register_lookup(UUIDIn)
CharField.register_lookup(UUIDIn)
ForeignKey.register_lookup(UUIDIn)


class UUIDValidationError(Exception):
    pass


def validate_uuids(ids):
    for identifier in ids:
        try:
            if not isinstance(identifier, UUID):
                UUID(identifier, version=4)
        except (TypeError, ValueError):
            # the value is not a valid hex code for a UUID, so we don't return any results
            raise UUIDValidationError(
                "{} did not pass UUID validation".format(identifier)
            )
    return ids


class FilterByUUIDQuerysetMixin(object):
    """
    As a workaround to the SQLITE_MAX_VARIABLE_NUMBER, so we can avoid having to chunk our queries,
    we pass in the list of ids (after being validated) as an inline query statement.
    """

    def filter_by_uuids(self, ids, validate=True):
        id_field = self.model._meta.pk.attname
        return self._by_uuids(ids, validate, id_field, True)

    def exclude_by_uuids(self, ids, validate=True):
        id_field = self.model._meta.pk.attname
        return self._by_uuids(ids, validate, id_field, False)

    def _by_uuids(self, ids, validate, field_name, include):
        if isinstance(ids, QuerySet):
            # If we have been passed a queryset, we can shortcut and just filter by the field name
            # on the queryset itself.
            lookup = "in"
        else:
            if len(ids) > 10000:
                logger.warn(
                    """
                    More than 10000 UUIDs passed to filter by uuids method,
                    these should be batched into separate querysets to avoid SQL Query too large errors in SQLite
                """
                )
            if validate:
                try:
                    validate_uuids(ids)
                except UUIDValidationError:
                    # the value is not a valid hex code for a UUID, so we don't return any results
                    return self.none()
            lookup = "uuidin"
        kwargs = {"{}__{}".format(field_name, lookup): ids}
        if include:
            return self.filter(**kwargs)
        return self.exclude(**kwargs)
