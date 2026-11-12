from typing import ClassVar

from django.db.models import Q
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
from kolibri.core.content.models import VirtualContentNode
from kolibri.core.content.viewsets.contentnode.base import resolve_content_nodes


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
        extra_kwargs: ClassVar[dict] = {
            "channel_id": {"required": False},
            "content_id": {"required": False},
            "user": {"write_only": True},
        }

    def validate(self, data):
        node_id = data["contentnode_id"]
        contentnode = resolve_content_nodes(
            [node_id], fields=("channel_id", "content_id")
        ).get(node_id)
        if contentnode is None:
            raise ValidationError(
                f"ContentNode for contentnode_id {node_id} does not exist"
            )

        data.setdefault("channel_id", contentnode["channel_id"])
        data.setdefault("content_id", contentnode["content_id"])

        return data


class BookmarksFilterset(FilterSet):
    descendant_of = UUIDFilter(method="filter_descendant_of")

    class Meta:
        model = Bookmark
        fields: ClassVar[list] = ["contentnode_id"]

    def filter_descendant_of(self, queryset, name, value):
        node_id = value.hex
        if node_id not in resolve_content_nodes([node_id], fields=()):
            raise ValidationError(
                f"ContentNode for contentnode_id {value} does not exist"
            )
        descendants = ContentNode.objects.filter(pk=node_id).get_descendants(
            include_self=True
        )
        root_of = dict(
            VirtualContentNode.objects.filter(
                id__inline_in=list(queryset.values_list("contentnode_id", flat=True))
            ).values_list("id", "root_id")
        )
        roots_below = set(
            descendants.filter(id__inline_in=set(root_of.values())).values_list(
                "id", flat=True
            )
        )
        page_ids = [page for page, root in root_of.items() if root in roots_below]
        return queryset.filter(
            Q(contentnode_id=node_id)
            | Q(contentnode_id__in=descendants.values_list("id", flat=True))
            | Q(contentnode_id__inline_in=page_ids)
        )


class BookmarksViewSet(ValuesViewset):
    serializer_class = BookmarksSerializer
    queryset = Bookmark.objects.all()
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
    )
    filterset_class = BookmarksFilterset
