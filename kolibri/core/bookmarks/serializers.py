from rest_framework.serializers import ModelSerializer

from .models import Bookmark


class BookmarksSerializer(ModelSerializer):
    class Meta:
        model = Bookmark
        fields = (
            "id",
            "channel_id",
            "content_id",
            "contentnode_id",
        )
