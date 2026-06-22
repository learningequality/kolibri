from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import UUIDFilter
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import ValidationError

from kolibri.core.api import ValuesViewset
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.bookmarks.models import Bookmark
from kolibri.core.content.models import ContentNode


class BookmarksSerializer(ModelSerializer):
    class Meta:
        model = Bookmark
        fields = (
            "id",
            "channel_id",
            "content_id",
            "contentnode_id",
            "user",
        )
        read_only_fields = ("id",)
        extra_kwargs = {
            "channel_id": {"required": False},
            "content_id": {"required": False},
            "user": {"write_only": True},
        }

    def validate(self, data):
        try:
            contentnode = ContentNode.objects.get(pk=data["contentnode_id"])
        except ContentNode.DoesNotExist:
            raise ValidationError(
                "ContentNode for contentnode_id {} does not exist".format(
                    data["contentnode_id"]
                )
            )

        data.setdefault("channel_id", contentnode.channel_id)
        data.setdefault("content_id", contentnode.content_id)

        return data


class BookmarksFilterset(FilterSet):
    descendant_of = UUIDFilter(method="filter_descendant_of")

    class Meta:
        model = Bookmark
        fields = ["contentnode_id"]

    def filter_descendant_of(self, queryset, name, value):
        try:
            contentnode = ContentNode.objects.get(pk=value)
        except ContentNode.DoesNotExist:
            raise ValidationError(
                "ContentNode for contentnode_id {} does not exist".format(value)
            )
        descendant_ids = contentnode.get_descendants(include_self=True).values_list(
            "id", flat=True
        )
        return queryset.filter(contentnode_id__in=descendant_ids)


class BookmarksViewSet(ValuesViewset):
    serializer_class = BookmarksSerializer
    queryset = Bookmark.objects.all()
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
    )
    filterset_class = BookmarksFilterset
