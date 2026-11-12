from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from rest_framework.response import Response

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
from .virtual import admitted_virtual_ids


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
        page_ids = list(
            models.VirtualContentNode.objects.filter(
                id__inline_in=list(queryset.values_list("contentnode_id", flat=True))
            ).values_list("id", flat=True)
        )
        available_page_ids = admitted_virtual_ids(
            page_ids, models.ContentNode.objects.filter(available=True)
        )
        if not value:
            available_page_ids = set(available_page_ids)
            page_ids = [i for i in page_ids if i not in available_page_ids]
        else:
            page_ids = available_page_ids
        return queryset.filter(
            Q(available=value) | Q(contentnode_id__inline_in=page_ids)
        )


class BookmarkSerializer(KolibriModelSerializer):
    class Meta:
        model = Bookmark
        fields = ("id", "contentnode_id", "created")


class ContentNodeBookmarkSerializer(ContentNodeSerializer):
    bookmark = BookmarkSerializer(read_only=True)

    class Meta(ContentNodeSerializer.Meta):
        fields = (*ContentNodeSerializer.Meta.fields, "bookmark")


class ContentNodeBookmarksViewset(
    InternalContentNodeMixin, BaseValuesViewset, ListModelMixin
):
    serializer_class = ContentNodeBookmarkSerializer

    # Not a relation on ContentNode, so auto-deferral cannot reach it: the
    # bookmark rows are the queryset this viewset serializes nodes for.
    deferred_fields = (*InternalContentNodeMixin.deferred_fields, "bookmark")

    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
    )
    filterset_class = BookmarkFilter
    pagination_class = ValuesViewsetLimitOffsetPagination

    def get_queryset(self):
        return Bookmark.objects.all().order_by("-created")

    def list(self, request, *args, **kwargs):
        bookmarks, paginated = self._get_list_queryset()
        self._bookmark_of = {
            bookmark["contentnode_id"]: bookmark
            for bookmark in bookmarks.values("id", "contentnode_id", "created")
        }
        nodes = self.resolve_nodes(self._bookmark_of, models.ContentNode.objects.all())
        results = []
        for node_id, bookmark in self._bookmark_of.items():
            node = nodes.get(node_id)
            if node is not None:
                node["bookmark"] = bookmark
                results.append(node)
        if paginated:
            return self.get_paginated_response(results)
        return Response(results)

    def consolidate(self, items, queryset):
        items = super().consolidate(items, queryset)
        for item in items:
            item["bookmark"] = self._bookmark_of.get(item["id"])
        return items
