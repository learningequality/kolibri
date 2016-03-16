from models import ChannelMetadata, ContentMetadata
from rest_framework import serializers


class ChannelMetadataSerializer(serializers.HyperlinkedModelSerializer):

    contentmetadatas = serializers.HyperlinkedIdentityField(
        lookup_field='channel_id', view_name='contentmetadata-list', lookup_url_kwarg='channelmetadata_channel_id')

    class Meta:
        model = ChannelMetadata
        fields = ('url', 'channel_id', 'name', 'description', 'author', 'theme', 'subscribed', 'contentmetadatas')
        extra_kwargs = {
            'url': {'lookup_field': 'channel_id', 'view_name': 'channelmetadata-detail'}
        }


class ContentMetadataSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentMetadata
        depth = 1
        fields = (
            'content_id', 'title', 'description', 'kind', 'slug', 'total_file_size', 'available', 'license', 'parent', 'prerequisite', 'is_related'
        )
