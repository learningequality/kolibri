from uuid import UUID

from django.db import connection
from django.db.models import Q
from django.http import HttpResponseBadRequest
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.serializers import Serializer
from rest_framework.viewsets import GenericViewSet

from kolibri.core.content import models
from kolibri.core.content.constants.schema_versions import CONTENT_SCHEMA_VERSION
from kolibri.core.content.constants.schema_versions import MIN_CONTENT_SCHEMA_VERSION
from kolibri.core.content.utils.sqlalchemybridge import BASES


class ImportMetadataViewset(GenericViewSet):
    queryset = models.ContentNode.objects.all()

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
            return Response(
                {"error": "Invalid UUID format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        content_schema = request.query_params.get(
            "schema_version", self.default_content_schema
        )

        try:
            if int(content_schema) > int(self.default_content_schema):
                return HttpResponseBadRequest(self._error_message(False))
            if int(content_schema) < int(self.min_content_schema):
                return HttpResponseBadRequest(self._error_message(True))
            base = BASES[content_schema]
        except ValueError:
            return HttpResponseBadRequest(
                "Schema version is not parseable by this version of Kolibri"
            )
        except AttributeError:
            return HttpResponseBadRequest(
                "Schema version is not known by this version of Kolibri"
            )

        # Get the model for the target node here - we do this so that we trigger a 404 immediately if the node
        # does not exist.
        node = get_object_or_404(models.ContentNode.objects.all(), pk=pk)

        nodes = node.get_ancestors(include_self=True)

        data = {}

        files = models.File.objects.filter(contentnode__in=nodes)
        through_tags = models.ContentNode.tags.through.objects.filter(
            contentnode__in=nodes
        )
        assessmentmetadata = models.AssessmentMetaData.objects.filter(
            contentnode__in=nodes
        )
        localfiles = models.LocalFile.objects.filter(files__in=files).distinct()
        tags = models.ContentTag.objects.filter(
            id__in=through_tags.values_list("contenttag_id", flat=True)
        ).distinct()
        languages = models.Language.objects.filter(
            Q(id__in=files.values_list("lang_id", flat=True))
            | Q(id__in=nodes.values_list("lang_id", flat=True))
        )
        node_ids = nodes.values_list("id", flat=True)
        prerequisites = models.ContentNode.has_prerequisite.through.objects.filter(
            from_contentnode_id__in=node_ids, to_contentnode_id__in=node_ids
        )
        related = models.ContentNode.related.through.objects.filter(
            from_contentnode_id__in=node_ids, to_contentnode_id__in=node_ids
        )
        channel_metadata = models.ChannelMetadata.objects.filter(id=node.channel_id)

        cursor = connection.cursor()

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
            cursor.execute(*qs.query.sql_with_params())
            data[qs.model._meta.db_table] = [
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

        return Response(data)
