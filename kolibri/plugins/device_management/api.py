from django.db.models import Q
from django.db.models import Sum
from django.http.response import JsonResponse
from django.views.decorators.http import require_GET
from django_filters.rest_framework import DjangoFilterBackend
from le_utils.constants import content_kinds
from rest_framework import mixins
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from kolibri.core.content.api import ChannelMetadataFilter
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.serializers import ChannelMetadataSerializer
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.import_export_content import get_nodes_to_transfer
from kolibri.core.decorators import query_params_required


class DeviceChannelMetadataSerializer(ChannelMetadataSerializer):
    on_device_resources = serializers.IntegerField(source="root.on_device_resources")
    on_device_file_size = serializers.IntegerField(source="root.on_device_file_size")
    importable_coach_contents = serializers.IntegerField(source="root.importable_coach_contents")
    importable_file_size = serializers.IntegerField(source="root.importable_file_size")
    importable_resources = serializers.IntegerField(source="root.importable_resources")
    importable_file_size_deduped = serializers.IntegerField(source="importable_file_size")
    importable_resources_deduped = serializers.IntegerField(source="importable_resources")

    class Meta:
        model = ChannelMetadata
        fields = (
            "author",
            "description",
            "id",
            "last_updated",
            "lang_code",
            "lang_name",
            "name",
            "root",
            "thumbnail",
            "version",
            "available",
            "num_coach_contents",
            "importable_coach_contents",
            "on_device_file_size",
            "on_device_resources",
            # In the case that there is duplication in the channel
            # These two will be accurate representations of the total
            # resources and total file size on the device.
            "total_resource_count",
            "published_size",
            "total_file_duplication",
            "total_resource_duplication",
            "importable_file_size",
            "importable_file_size_deduped",
            "importable_resources",
            "importable_resources_deduped",
            "importable_file_duplication",
            "importable_resource_duplication",
        )


class DeviceChannelMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DeviceChannelMetadataSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelMetadataFilter

    def get_queryset(self):
        return (
            ChannelMetadata.objects.all()
            .order_by("-last_updated")
            .select_related("root")
            .select_related("root__lang")
        )


class ContentNodeGranularSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentNode
        fields = (
            "id",
            "available",
            "coach_content",
            "kind",
            "title",
            "num_coach_contents",
            "on_device_file_size",
            "on_device_resources",
            "importable_coach_contents",
            "importable_file_size",
            "importable_resources",
        )


class ContentNodeGranularViewset(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ContentNodeGranularSerializer

    def get_queryset(self):
        return (
            ContentNode.objects.all()
            .filter(renderable_contentnodes_q_filter)
            .distinct()
        )

    def retrieve(self, request, pk):
        queryset = self.get_queryset()
        instance = get_object_or_404(queryset, pk=pk)
        children = queryset.filter(parent=instance)
        if request.query_params.get("check_importable", None):
            # When we are checking for importability, also show things that are
            # currently available, as the user may want to unselect them.
            children = children.filter(Q(importable=True) | Q(available=True))
        elif request.query_params.get("for_export", None):
            children = children.filter(available=True)

        child_serializer = self.get_serializer(children, many=True)

        return Response(child_serializer.data)


@require_GET
@query_params_required(channel_id=str)
def get_file_size_and_count(request, channel_id):
    node_ids = [node_id for node_id in request.GET.get("node_ids", "").split(",") if node_id]
    exclude_node_ids = [node_id for node_id in request.GET.get("exclude_node_ids", "").split(",") if node_id]

    for_export = bool(request.GET.get('for_export', False) == "true")
    contentnodes = get_nodes_to_transfer(channel_id, node_ids, exclude_node_ids, for_export, renderable_only=not for_export)
    files = LocalFile.objects.filter(
        files__contentnode__in=contentnodes,
        available=for_export,
    )
    if not for_export:
        files = files.filter(importable=True)
    files = files.distinct()
    file_size = files.aggregate(Sum("file_size"))["file_size__sum"] or 0
    resources = contentnodes.exclude(kind=content_kinds.TOPIC).values("content_id").distinct().count()

    return JsonResponse(
        {
            "size": file_size,
            "count": resources,
        }
    )
