from kolibri.content.models import ChannelMetadata, ContentMetadata, File
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


class DualLookuplinkedIdentityField(serializers.HyperlinkedIdentityField):
    def __init__(self, view_name, lookup_field_1, lookup_field_2, **kwargs):
        super(DualLookuplinkedIdentityField, self).__init__(view_name, **kwargs)

    def to_representation(self, value):
        view_name = self.view_name
        lookup_field_1 = self._kwargs['lookup_field_1']
        lookup_field_2 = self._kwargs['lookup_field_2']
        kwargs = {lookup_field_1: self.context['channel_id'], lookup_field_2: getattr(value, lookup_field_2)}
        request = self.context.get('request', None)
        format = self.context.get('format', None)

        return self.reverse(view_name, kwargs=kwargs, request=request, format=format)


class ContentMetadataSerializer(serializers.ModelSerializer):
    url = DualLookuplinkedIdentityField(
        view_name='contentmetadata-detail',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='content_id'
    )
    ancestor_topics = DualLookuplinkedIdentityField(
        view_name='contentmetadata-ancestor-topics',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='content_id',
    )
    immediate_children = DualLookuplinkedIdentityField(
        view_name='contentmetadata-immediate-children',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='content_id',
    )
    leaves = DualLookuplinkedIdentityField(
        view_name='contentmetadata-leaves',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='content_id',
    )
    all_prerequisites = DualLookuplinkedIdentityField(
        view_name='contentmetadata-all-prerequisites',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='content_id',
    )
    all_related = DualLookuplinkedIdentityField(
        view_name='contentmetadata-all-related',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='content_id',
    )

    missing_files = DualLookuplinkedIdentityField(
        view_name='contentmetadata-missing-files',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='content_id',
    )

    class Meta:
        model = ContentMetadata
        depth = 1
        fields = (
            'url', 'content_id', 'title', 'description', 'kind', 'slug', 'total_file_size', 'available',
            'license', 'parent', 'prerequisite', 'is_related', 'ancestor_topics', 'immediate_children',
            'leaves', 'all_prerequisites', 'all_related', 'missing_files'
        )


class FileSerializer(serializers.ModelSerializer):
    url = DualLookuplinkedIdentityField(
        view_name='file-detail',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk'
    )

    class Meta:
        model = File
        fields = ('url', 'checksum', 'available', 'file_size', 'content_copy', 'contentmetadata', 'file_format', 'preset', 'lang')
