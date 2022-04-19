from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import ValidationError

from .models import Bookmark
from kolibri.core.api import ValuesViewset
from kolibri.core.auth.api import KolibriAuthPermissions
from kolibri.core.auth.api import KolibriAuthPermissionsFilter
from kolibri.core.content.models import ContentNode


class BookmarksSerializer(ModelSerializer):
    class Meta:
        model = Bookmark
        fields = (
            "contentnode_id",
            "user",
        )

    def validate(self, data):
        try:
            contentnode = ContentNode.objects.get(pk=data["contentnode_id"])
        except ContentNode.DoesNotExist:
            raise ValidationError(
                "ContentNode for contentnode_id {} does not exist".format(
                    data["contentnode_id"]
                )
            )

        if "channel_id" not in data:
            data["channel_id"] = contentnode.channel_id
        if "content_id" not in data:
            data["content_id"] = contentnode.content_id

        return data


class BookmarksViewSet(ValuesViewset):
    values = ("channel_id", "contentnode_id", "id", "content_id")
    serializer_class = BookmarksSerializer
    queryset = Bookmark.objects.all()
    permission_classes = (KolibriAuthPermissions,)
    filter_backends = (
        KolibriAuthPermissionsFilter,
        DjangoFilterBackend,
    )
    filter_fields = ("contentnode_id",)
