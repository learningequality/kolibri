from django.core.handlers.wsgi import WSGIRequest
from kolibri.content.models import ChannelMetadata, ContentNode, File
from rest_framework import serializers


class ChannelMetadataSerializer(serializers.HyperlinkedModelSerializer):

    contentnodes = serializers.HyperlinkedIdentityField(
        lookup_field='channel_id', view_name='contentnode-list', lookup_url_kwarg='channelmetadata_channel_id')

    class Meta:
        model = ChannelMetadata
        fields = ('url', 'root_pk', 'channel_id', 'name', 'description', 'author', 'contentnodes')
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


class FileSerializer(serializers.ModelSerializer):
    url = DualLookuplinkedIdentityField(
        view_name='file-detail',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk'
    )
    storage_url = serializers.SerializerMethodField()

    def get_storage_url(self, target_node):
        return target_node.get_url()

    class Meta:
        model = File
        depth = 1
        fields = ('url', 'storage_url', 'id', 'priority', 'checksum', 'available', 'file_size', 'extension', 'preset', 'lang', 'supplementary', 'thumbnail')


class ContentNodeSerializer(serializers.ModelSerializer):
    url = DualLookuplinkedIdentityField(
        view_name='contentnode-detail',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk'
    )
    ancestor_topics = DualLookuplinkedIdentityField(
        view_name='contentnode-ancestor-topics',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk',
    )
    immediate_children = DualLookuplinkedIdentityField(
        view_name='contentnode-immediate-children',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk',
    )
    leaves = DualLookuplinkedIdentityField(
        view_name='contentnode-leaves',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk',
    )
    all_prerequisites = DualLookuplinkedIdentityField(
        view_name='contentnode-all-prerequisites',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk',
    )
    all_related = DualLookuplinkedIdentityField(
        view_name='contentnode-all-related',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk',
    )
    missing_files = DualLookuplinkedIdentityField(
        view_name='contentnode-missing-files',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk',
    )

    # Here we use a FileSerialize instead just the files reverse FK is because we want to get the computed field storage_url
    # In order to improve performance in production, we should implement a client side method to calculate the file url using
    # extension and checksum field along with the setting.STORAGE_ROOT, which can be passed to front end at template boostrapping.
    files = FileSerializer(many=True, read_only=True)
    ancestors = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        # Instantiate the superclass normally
        super(ContentNodeSerializer, self).__init__(*args, **kwargs)

        # enable dynamic fields specification!
        if not isinstance(self.context['request'], WSGIRequest):
            if 'request' in self.context and self.context['request'].query_params.get('fields'):
                fields = self.context['request'].query_params.get('fields').split(',')
                # Drop any fields that are not specified in the `fields` argument.
                allowed = set(fields)
                existing = set(self.fields.keys())
                for field_name in existing - allowed:
                    self.fields.pop(field_name)

    def get_ancestors(self, target_node):
        """
        in descending order (root ancestor first, immediate parent last)
        """
        return target_node.get_ancestors().using(self.context['channel_id']).values('pk', 'title')

    class Meta:
        model = ContentNode
        depth = 1
        fields = (
            'pk', 'id', 'url', 'instance_id', 'content_id', 'title', 'description', 'kind', 'available', 'tags', 'sort_order', 'license_owner',
            'license', 'prerequisite', 'is_related', 'ancestor_topics', 'immediate_children', 'files', 'leaves', 'all_prerequisites',
            'all_related', 'missing_files', 'ancestors'
        )

class SimplifiedContentNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentNode
        depth = 1
        fields = (
            'pk', 'instance_id', 'content_id', 'title', 'description', 'kind', 'available', 'tags', 'sort_order', 'license_owner',
            'license', 'prerequisite', 'is_related', 'files'
        )
