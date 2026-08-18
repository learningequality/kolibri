from django.utils.decorators import method_decorator
from django.views.decorators.http import etag
from le_utils.constants import content_kinds
from rest_framework import mixins
from rest_framework import serializers
from rest_framework import viewsets
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from kolibri.core.content import models
from kolibri.core.content.utils.cache import get_cache_key
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_disk,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_peer,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_studio,
)


class ContentNodeGranularSerializer(serializers.ModelSerializer):
    num_coach_contents = serializers.SerializerMethodField()
    coach_content = serializers.SerializerMethodField()
    total_resources = serializers.SerializerMethodField()
    importable = serializers.SerializerMethodField()
    new_resource = serializers.SerializerMethodField()
    num_new_resources = serializers.SerializerMethodField()
    updated_resource = serializers.SerializerMethodField()
    is_leaf = serializers.SerializerMethodField()

    class Meta:
        model = models.ContentNode
        fields = (
            "id",
            "available",
            "coach_content",
            "importable",
            "is_leaf",
            "kind",
            "modality",
            "num_coach_contents",
            "on_device_resources",
            "title",
            "total_resources",
            "new_resource",
            "num_new_resources",
            "updated_resource",
        )

    @property
    def channel_stats(self):
        return self.context["channel_stats"]

    def get_total_resources(self, instance):
        # channel_stats is None for export
        if self.channel_stats is None:
            return instance.on_device_resources
        return self.channel_stats.get(instance.id, {"total_resources": 0})[
            "total_resources"
        ]

    def get_num_coach_contents(self, instance):
        # If for exporting, only show what is available on server. For importing,
        # show all of the coach contents in the topic.
        if self.channel_stats is None:
            return instance.num_coach_contents
        return self.channel_stats.get(instance.id, {"num_coach_contents": 0})[
            "num_coach_contents"
        ]

    def get_coach_content(self, instance):
        # If for exporting, only show what is on server. For importing,
        # show all of the coach contents in the topic.
        if self.channel_stats is None:
            return instance.coach_content
        return self.channel_stats.get(instance.id, {"coach_content": False})[
            "coach_content"
        ]

    def get_importable(self, instance):
        # If for export, just return None
        if self.channel_stats is None:
            return None
        return instance.id in self.channel_stats

    def get_new_resource(self, instance):
        # If for export, just return None
        if self.channel_stats is None:
            return None
        return self.channel_stats.get(instance.id, {}).get("new_resource", False)

    def get_num_new_resources(self, instance):
        # If for export, just return None
        if self.channel_stats is None:
            return None
        return self.channel_stats.get(instance.id, {}).get("num_new_resources", 0)

    def get_updated_resource(self, instance):
        # If for export, just return None
        if self.channel_stats is None:
            return None
        return self.channel_stats.get(instance.id, {}).get("updated_resource", False)

    def get_is_leaf(self, instance):
        return instance.kind != content_kinds.TOPIC


@method_decorator(etag(get_cache_key), name="retrieve")
class ContentNodeGranularViewset(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = ContentNodeGranularSerializer

    def get_queryset(self):
        return (
            models.ContentNode.objects.all()
            .prefetch_related("files__local_file")
            .filter(renderable_contentnodes_q_filter)
            .distinct()
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if hasattr(self, "channel_stats"):
            context.update({"channel_stats": self.channel_stats})
        return context

    def retrieve(self, request, pk):
        queryset = self.get_queryset()
        instance = get_object_or_404(queryset, pk=pk)
        channel_id = instance.channel_id
        drive_id = self.request.query_params.get("importing_from_drive_id", None)
        peer_id = self.request.query_params.get("importing_from_peer_id", None)
        for_export = self.request.query_params.get("for_export", None)
        flag_count = sum(int(bool(flag)) for flag in (drive_id, peer_id, for_export))
        if flag_count > 1:
            raise serializers.ValidationError(
                "Must specify at most one of importing_from_drive_id, importing_from_peer_id, and for_export"
            )
        if not flag_count:
            self.channel_stats = get_channel_stats_from_studio(channel_id)
        if for_export:
            self.channel_stats = None
        if drive_id:
            try:
                self.channel_stats = get_channel_stats_from_disk(channel_id, drive_id)
            except LocationError:
                raise serializers.ValidationError(
                    "The external drive with given drive id {} does not exist.".format(
                        drive_id
                    )
                )
        if peer_id:
            try:
                self.channel_stats = get_channel_stats_from_peer(channel_id, peer_id)
            except LocationError:
                raise serializers.ValidationError(
                    "The network location with the id {} does not exist".format(peer_id)
                )
        children = queryset.filter(parent=instance)
        parent_serializer = self.get_serializer(instance)
        parent_data = parent_serializer.data
        child_serializer = self.get_serializer(children, many=True)
        parent_data["children"] = child_serializer.data

        parent_data["ancestors"] = list(instance.get_ancestors().values("id", "title"))

        return Response(parent_data)
