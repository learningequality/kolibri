"""
Mixins for Django REST Framework ViewSets and Django Querysets
"""

import logging
import re
from uuid import UUID

from django.core.exceptions import EmptyResultSet
from django.db.models import Field
from django.db.models import ForeignKey
from django.db.models import ManyToManyField
from django.db.models import Q
from django.db.models import QuerySet
from django.db.models.lookups import In
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework import status
from rest_framework.response import Response

logger = logging.getLogger(__name__)

# Inlining literals trades SQLITE_MAX_VARIABLE_NUMBER for SQLITE_MAX_SQL_LENGTH:
# past this many, batch into separate querysets instead.
MAX_INLINE_LITERALS = 10000

# Strings safe to embed in a statement. An allowlist rather than a quote blocklist
# because a quote is not the only way out: both backends substitute placeholders
# on the finished SQL string, so an inlined ``%s`` becomes a real placeholder and
# shifts every bound parameter after it.
INLINABLE_RE = re.compile(r"^[0-9a-zA-Z_-]+$")


def inline_literal(param):
    """
    ``param`` as a SQL literal, or None if it cannot be safely inlined.

    Integers go in unquoted: postgres rejects a quoted literal against an integer
    column, and an integer pk list needs inlining as much as a UUID one does.

    A ``UUID`` instance only reaches here from Django's own ``UUIDField`` on a
    backend with a native uuid type; its dashed form is what that column
    compares against. Morango's ``UUIDField`` prepares 32-char hex instead, so it
    takes the string branch.
    """
    if isinstance(param, bool):
        return None
    if isinstance(param, int):
        return str(param)
    if isinstance(param, UUID):
        return "'{}'".format(param)
    if isinstance(param, str) and INLINABLE_RE.match(param):
        return "'{}'".format(param)
    return None


class BulkCreateMixin:
    def get_serializer(self, *args, **kwargs):
        """if an array is passed, set serializer to many"""
        if isinstance(kwargs.get("data", {}), list):
            kwargs["many"] = True
        return super().get_serializer(*args, **kwargs)


class BulkDeleteMixin:
    # Taken from https://github.com/miki725/django-rest-framework-bulk

    def allow_bulk_destroy(self):
        """
        Hook to ensure that the bulk destroy should be allowed.
        By default this checks that the destroy is only applied to
        filtered querysets.
        """
        qs = self.get_queryset()
        filter_fields = set()

        for backend in list(self.filter_backends):
            if issubclass(backend, DjangoFilterBackend):
                filterset_class = backend.get_filterset_class(backend, self, qs)
                if filterset_class:
                    filter_fields.update(filterset_class.get_fields().keys())

            if issubclass(backend, filters.SearchFilter):
                search_param = backend.search_param
                if search_param:
                    filter_fields.add(search_param)

        # Only let a bulk destroy if the queryset is being filtered by a valid filter_field parameter
        return any(key in filter_fields for key in self.request.query_params.keys())

    def bulk_destroy(self, request, *args, **kwargs):
        qs = self.get_queryset()

        filtered = self.filter_queryset(qs)
        if not self.allow_bulk_destroy():
            return Response(status=status.HTTP_400_BAD_REQUEST)

        self.perform_bulk_destroy(filtered)

        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_destroy(self, instance):
        instance.delete()

    def perform_bulk_destroy(self, objects):
        for obj in objects:
            self.perform_destroy(obj)


class InlineIn(In):
    """
    ``IN`` with its values embedded in the statement rather than bound.

    A bound list spends one SQL variable per value, and Django does not split
    ``IN`` lists on SQLite, whose statements cap at
    ``SQLITE_MAX_VARIABLE_NUMBER`` — so a long list raises ``too many SQL
    variables``. Inlining trades that ceiling for ``SQLITE_MAX_SQL_LENGTH``.

    Values that cannot be safely embedded are bound instead, so this is always
    correct — just not always a single statement's worth of variables.
    """

    lookup_name = "inline_in"

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
            _, sqls_params = self.batch_process_rhs(compiler, connection, rhs)
            literals = [inline_literal(param) for param in sqls_params]
            if all(literal is not None for literal in literals):
                self._warn_if_oversized(len(literals))
                return "(" + ",".join(literals) + ")", ()
        return super().process_rhs(compiler, connection)

    def _warn_if_oversized(self, count):
        if count <= MAX_INLINE_LITERALS:
            return
        field = self.lhs.output_field
        logger.warning(
            "Inlining %d literals into an IN on %s.%s; batch or paginate the "
            "source list to stay clear of SQLITE_MAX_SQL_LENGTH.",
            count,
            field.model.__name__,
            field.name,
        )


# Registered on the base field: a deferred fetch inlines whatever pk its model
# has, which is as often an AutoField or Django's own UUIDField as a checksum.
Field.register_lookup(InlineIn)
# Relations need registering separately: ``ForeignObject.get_lookups`` truncates
# the MRO at itself, so a lookup on the target field is invisible through one
# (File.local_file_id, ContentNode.tags.through.contentnode_id).
ForeignKey.register_lookup(InlineIn)
ManyToManyField.register_lookup(InlineIn)


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


class FilterByUUIDQuerysetMixin:
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
            if validate:
                try:
                    validate_uuids(ids)
                except UUIDValidationError:
                    # the value is not a valid hex code for a UUID, so we don't return any results
                    return self.none()
            lookup = InlineIn.lookup_name
        kwargs = {"{}__{}".format(field_name, lookup): ids}
        if include:
            return self.filter(**kwargs)
        return self.exclude(**kwargs)


checksum_re = re.compile("^[0-9a-f]{32}$")


def checksums_q(field_name, checksums):
    """
    Q matching field_name against checksums as inline literals, as a workaround to
    the SQLITE_MAX_VARIABLE_NUMBER.

    A malformed or empty list raises EmptyResultSet at compile time rather than
    matching zero rows, so ORing this with another condition drops this branch and
    leaves that condition standing alone.
    """
    if not all(checksum_re.match(checksum) for checksum in checksums):
        return Q(pk__in=[])
    return Q(**{"{}__{}".format(field_name, InlineIn.lookup_name): checksums})


class FilterByChecksumQuerysetMixin:
    def filter_by_checksums(self, checksums):
        return self.filter(checksums_q(self.model._meta.pk.attname, checksums))
