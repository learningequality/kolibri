from django.db.models import OuterRef
from django.db.models import Subquery
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet

from kolibri.core.api import BaseValuesViewset
from kolibri.core.api import ListModelMixin
from kolibri.core.auth.permissions import KolibriAuthPermissions
from kolibri.core.auth.permissions import KolibriAuthPermissionsFilter
from kolibri.core.bookmarks.models import Bookmark
from kolibri.core.content import models
from kolibri.core.serializers import KolibriModelSerializer
from kolibri.core.utils.pagination import ValuesViewsetLimitOffsetPagination

from .base import ContentNodeSerializer
from .base import InternalContentNodeMixin


class BookmarkFilter(FilterSet):
    available = BooleanFilter(
        method="filter_available",
    )
    kind = CharFilter(
        method="filter_kind",
    )

    class Meta:
        model = Bookmark
        fields = ("kind",)

    def filter_kind(self, queryset, name, value):
        queryset = queryset.annotate(
            kind=Subquery(
                models.ContentNode.objects.filter(
                    id=OuterRef("contentnode_id"),
                ).values_list("kind", flat=True)[:1]
            )
        )

        return queryset.filter(kind=value)

    def filter_available(self, queryset, name, value):
        queryset = queryset.annotate(
            available=Subquery(
                models.ContentNode.objects.filter(
                    id=OuterRef("contentnode_id"),
                ).values_list("available", flat=True)[:1]
            )
        )

        return queryset.filter(available=value)


class BookmarkSerializer(KolibriModelSerializer):
    class Meta:
        model = Bookmark
        fields = ("id", "contentnode_id", "created")


class ContentNodeBookmarkSerializer(ContentNodeSerializer):
    bookmark = BookmarkSerializer(read_only=True)

    class Meta(ContentNodeSerializer.Meta):
        fields = ContentNodeSerializer.Meta.fields + ("bookmark",)


class ContentNodeBookmarksViewset(
    InternalContentNodeMixin, BaseValuesViewset, ListModelMixin
):
    serializer_class = ContentNodeBookmarkSerializer

    # Not a relation on ContentNode, so auto-deferral cannot reach it: the
    # bookmark rows are the queryset this viewset serializes nodes for.
    deferred_fields = InternalContentNodeMixin.deferred_fields + ("bookmark",)

    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
    )
    filterset_class = BookmarkFilter
    pagination_class = ValuesViewsetLimitOffsetPagination

    def get_queryset(self):
        return Bookmark.objects.all().order_by("-created")

    def serialize(self, queryset):
        self.bookmark_queryset = queryset
        queryset = models.ContentNode.objects.filter(
            id__in=queryset.values_list("contentnode_id", flat=True)
        )
        return super().serialize(queryset)

    def consolidate(self, items, queryset):
        items = super().consolidate(items, queryset)
        sorted_items = []
        if items:
            item_lookup = {item["id"]: item for item in items}

            # now loop through ordered bookmark queryset to order nodes returned by same order
            for bookmark in self.bookmark_queryset.values(
                "id", "contentnode_id", "created"
            ):
                item = item_lookup.pop(bookmark["contentnode_id"], None)
                if item:
                    item["bookmark"] = bookmark
                    sorted_items.append(item)
        return sorted_items
