"""
Mixins for Django REST Framework ViewSets
"""
from uuid import UUID

from django.db import connection
from rest_framework import status
from rest_framework.response import Response


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


class FilterByUUIDQuerysetMixin(object):
    """
    As a workaround to the SQLITE_MAX_VARIABLE_NUMBER, so we can avoid having to chunk our queries,
    we pass in the list of ids (after being validated) as an inline query statement.
    """

    def filter_by_uuids(self, ids, validate=True):
        # make a copy of the passed in list
        ids_list = list(ids)
        for (idx, identifier) in enumerate(ids_list):
            if validate:
                try:
                    UUID(identifier, version=4)
                except ValueError:
                    # the string is not a valid hex code for a UUID, so we don't return any results
                    return self.none()
            # wrap the uuids in string quotations
            if connection.vendor == "sqlite":
                ids_list[idx] = "'{}'".format(identifier)
            elif connection.vendor == "postgresql":
                ids_list[idx] = "'{}'::uuid".format(identifier)
        query_string = ",".join(ids_list)
        where_clause = "id in ({})".format(query_string)
        return self.extra(where=[where_clause])
