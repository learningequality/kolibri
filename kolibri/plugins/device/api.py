import uuid

from django.db.models import Case
from django.db.models import When
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from rest_framework import viewsets
from rest_framework.exceptions import ParseError
from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.views import APIView

from kolibri.core.content.api import ChannelMetadataFilter
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.serializers import ChannelMetadataSerializer
from kolibri.core.content.utils.annotation import total_file_size
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_without_topics_q_filter,
)
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.import_export_content import calculate_files_to_transfer
from kolibri.core.content.utils.import_export_content import get_nodes_to_transfer
from kolibri.core.device.models import ContentCacheKey


class DeviceChannelMetadataSerializer(ChannelMetadataSerializer):
    def to_representation(self, instance):
        value = super(ChannelMetadataSerializer, self).to_representation(instance)

        # if the request includes a GET param 'include_fields', add the requested calculated fields
        if "request" in self.context:

            include_fields = (
                self.context["request"].GET.get("include_fields", "").split(",")
            )

            if include_fields:

                # build querysets for the full set of channel nodes, as well as those that are unrenderable
                channel_nodes = ContentNode.objects.filter(channel_id=instance.id)
                unrenderable_nodes = channel_nodes.exclude(
                    renderable_contentnodes_without_topics_q_filter
                )

                if "total_resources" in include_fields:
                    # count the total number of renderable non-topic resources in the channel
                    # (note: it's faster to count them all and then subtract the unrenderables, of which there are fewer)
                    value["total_resources"] = (
                        channel_nodes.dedupe_by_content_id().count()
                        - unrenderable_nodes.dedupe_by_content_id().count()
                    )

                if "total_file_size" in include_fields:
                    # count the total file size of files associated with renderable content nodes
                    # (note: it's faster to count them all and then subtract the unrenderables, of which there are fewer)
                    value["total_file_size"] = total_file_size(
                        channel_nodes
                    ) - total_file_size(unrenderable_nodes)

                if "on_device_resources" in include_fields:
                    # read the precalculated total number of resources from the channel already available
                    value["on_device_resources"] = instance.total_resource_count

                if "on_device_file_size" in include_fields:
                    # read the precalculated total size of available files associated with the channel
                    value["on_device_file_size"] = instance.published_size

        return value


class DeviceChannelMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DeviceChannelMetadataSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelMetadataFilter
    permission_classes = (CanManageContent,)

    def get_queryset(self):
        return ChannelMetadata.objects.all().select_related("root__lang")


class CalculateImportExportSizeView(APIView):
    permission_classes = (CanManageContent,)

    def post(self, request):
        try:
            channel_id = self.request.data["channel_id"]
        except KeyError:
            raise ValidationError(
                "channel_id is required for calculating file size and resource counts"
            )
        drive_id = self.request.data.get("drive_id")
        peer_id = self.request.data.get("peer_id")
        for_export = self.request.data.get("export")
        node_ids = self.request.data.get("node_ids")
        exclude_node_ids = self.request.data.get("exclude_node_ids")
        flag_count = sum(int(bool(flag)) for flag in (drive_id, peer_id, for_export))
        if flag_count > 1:
            raise ValidationError(
                "Must specify at most one of drive_id, peer_id, and export"
            )
        # By default filter to unavailable files
        available = False
        if for_export:
            available = True
        try:
            nodes_for_transfer = get_nodes_to_transfer(
                channel_id,
                node_ids,
                exclude_node_ids,
                available,
                drive_id=drive_id,
                peer_id=peer_id,
            )
        except LocationError:
            if drive_id:
                raise ValidationError(
                    "The external drive with given drive id {} does not exist.".format(
                        drive_id
                    )
                )
            if peer_id:
                raise ValidationError(
                    "The network location with the id {} does not exist".format(peer_id)
                )

        total_resource_count = (
            nodes_for_transfer.exclude(kind=content_kinds.TOPIC)
            .values("content_id")
            .distinct()
            .count()
        )
        _, total_file_size = calculate_files_to_transfer(nodes_for_transfer, available)

        return Response(
            {"resource_count": total_resource_count, "file_size": total_file_size}
        )


def validate_uuid(value):
    try:
        uuid.UUID(value, version=4)
        return True
    except ValueError:
        return False


class DeviceChannelOrderView(APIView):
    permission_classes = (CanManageContent,)

    def post(self, request, *args, **kwargs):
        try:
            ids = request.data
            assert isinstance(ids, list)
            assert all(map(validate_uuid, ids))
        except AssertionError:
            raise ParseError("Array of ids not sent in body of request")
        queryset = ChannelMetadata.objects.filter(root__available=True)
        total_channels = queryset.count()
        if len(ids) != total_channels:
            raise ParseError(
                "Expected {} ids, but only received {}".format(total_channels, len(ids))
            )
        if queryset.filter_by_uuids(ids).count() != len(ids):
            raise ParseError(
                "List of ids does not match the available channels on the server"
            )
        queryset.update(
            order=Case(*(When(id=uuid, then=i + 1) for i, uuid in enumerate(ids)))
        )
        ContentCacheKey.update_cache_key()
        return Response({})
