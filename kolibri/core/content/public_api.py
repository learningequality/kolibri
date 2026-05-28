from uuid import UUID

from django.core.exceptions import EmptyResultSet
from django.db import connection
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.viewsets import GenericViewSet

from kolibri.core.content import models
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.constants.schema_versions import MIN_CONTENT_SCHEMA_VERSION
from kolibri.core.content.utils.sqlalchemybridge import BASES
from kolibri.core.utils.pagination import ValuesViewsetCursorPagination


class OptionalPagination(ValuesViewsetCursorPagination):
    ordering = ("lft",)
    page_size_query_param = "max_results"


class ImportMetadataViewset(GenericViewSet):
    queryset = models.ContentNode.objects.all()
    pagination_class = OptionalPagination

    def get_serializer_class(self):
        """
        Add this purely to avoid warnings from DRF YASG schema generation.
        """
        return Serializer

    default_content_schema = CONTENT_SCHEMA_VERSION
    min_content_schema = MIN_CONTENT_SCHEMA_VERSION

    def _error_message(self, low):
        error = "Schema version is too "
        if low:
            error += "low"
        else:
            error += "high"
        if self.default_content_schema == self.min_content_schema:
            error += ", exports only suported for version {}".format(
                self.default_content_schema
            )
        else:
            error += ", exports only suported for versions {} to {}".format(
                self.min_content_schema, self.default_content_schema
            )
        return error

    def _validate_content_schema(self, content_schema):
        try:
            if int(content_schema) > int(self.default_content_schema):
                raise ValidationError(self._error_message(False))
            if int(content_schema) < int(self.min_content_schema):
                raise ValidationError(self._error_message(True))
        except ValueError:
            raise ValidationError(
                "Schema version is not parseable by this version of Kolibri"
            )
        except AttributeError:
            raise ValidationError(
                "Schema version is not known by this version of Kolibri"
            )
        return content_schema

    def _get_retrieve_queryset(self):
        pk = self.kwargs.get("pk")
        descendants = self.request.query_params.get("descendants", None)
        node = get_object_or_404(models.ContentNode.objects.all(), pk=pk)
        if descendants:
            # Return ancestors first, then descendants (excluding self to avoid duplication).
            # Ordering by lft puts ancestors (lower lft) before descendants (higher lft).
            ancestors = node.get_ancestors(include_self=True)
            node_descendants = node.get_descendants(include_self=False)
            queryset = (ancestors | node_descendants).order_by("lft")
        else:
            queryset = node.get_ancestors(include_self=True)

        return queryset, node

    def _serialize(self, nodes, node, content_schema):
        data = {}
        # Materialise FK lists and use `__uuidin` (inlines as SQL literals) instead of
        # `__in=<queryset>`, which gave postgres correlated subqueries it sometimes
        # mis-planned into multi-hour query times on a fresh test database.
        node_ids = list(nodes.values_list("id", flat=True))

        files = models.File.objects.filter(contentnode_id__uuidin=node_ids)
        through_tags = models.ContentNode.tags.through.objects.filter(
            contentnode_id__uuidin=node_ids
        )
        assessmentmetadata = models.AssessmentMetaData.objects.filter(
            contentnode_id__uuidin=node_ids
        )

        file_ids = list(files.values_list("id", flat=True))
        localfiles = models.LocalFile.objects.filter(
            files__id__uuidin=file_ids
        ).distinct()

        contenttag_ids = list(through_tags.values_list("contenttag_id", flat=True))
        tags = models.ContentTag.objects.filter(id__uuidin=contenttag_ids).distinct()

        # Lang codes are short strings (not UUIDs) and the distinct set across a
        # channel is tiny — dedupe and use a literal IN.
        lang_ids = set(files.values_list("lang_id", flat=True).distinct()) | set(
            nodes.values_list("lang_id", flat=True).distinct()
        )
        lang_ids.discard(None)
        languages = models.Language.objects.filter(id__in=lang_ids)

        prerequisites = models.ContentNode.has_prerequisite.through.objects.filter(
            from_contentnode_id__uuidin=node_ids,
            to_contentnode_id__uuidin=node_ids,
        )
        related = models.ContentNode.related.through.objects.filter(
            from_contentnode_id__uuidin=node_ids,
            to_contentnode_id__uuidin=node_ids,
        )
        channel_metadata = models.ChannelMetadata.objects.filter(id=node.channel_id)

        cursor = connection.cursor()
        base = BASES[content_schema]

        for qs in [
            nodes,
            files,
            through_tags,
            assessmentmetadata,
            localfiles,
            tags,
            languages,
            prerequisites,
            related,
            channel_metadata,
        ]:
            table_name = qs.model._meta.db_table
            table = base.classes[table_name].__table__
            raw_fields = [col.name for col in table.columns.values()]
            qs = qs.values(*raw_fields)
            # Avoid using the Django queryset directly, as it will coerce the database values
            # via its field 'from_db_value' transformers, whereas import metadata is read
            # directly from the database.
            # One example is for JSON field data that is stored as a string in the database,
            # we want to avoid that being coerced to Python objects.
            try:
                sql, params = qs.query.sql_with_params()
            except EmptyResultSet:
                # `__uuidin=[]` raises EmptyResultSet rather than emitting an empty IN.
                data[table_name] = []
                continue
            cursor.execute(sql, params)
            data[table_name] = [
                # Coerce any UUIDs to their hex representation, as Postgres raw values will be UUIDs
                dict(
                    zip(
                        raw_fields,
                        (
                            value.hex if isinstance(value, UUID) else value
                            for value in row
                        ),
                    )
                )
                for row in cursor
            ]

        data["schema_version"] = content_schema

        return data

    def retrieve(self, request, pk=None):
        """
        An endpoint to retrieve all content metadata required for importing a content node
        all of its ancestors, and any relevant needed metadata.

        :param request: request object
        :param pk: id parent node
        :return: an object with keys for each content metadata table and a schema_version key
        """
        try:
            UUID(pk)
        except ValueError:
            raise ValidationError({"error": "Invalid UUID format."})

        content_schema = request.query_params.get(
            "schema_version", self.default_content_schema
        )
        self._validate_content_schema(content_schema)

        queryset, node = self._get_retrieve_queryset()

        page_queryset = self.paginate_queryset(queryset)

        if page_queryset is not None:
            data = self._serialize(page_queryset, node, content_schema)
            return self.get_paginated_response(data)

        return Response(self._serialize(queryset, node, content_schema))
