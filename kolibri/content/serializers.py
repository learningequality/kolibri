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

    ancestor_ids = serializers.SerializerMethodField()
    immediate_children_ids = serializers.SerializerMethodField()
    preload = serializers.SerializerMethodField()

    def get_ancestor_ids(self, target_node):
        """
        in descending order (root ancestor first, immediate parent last)
        """
        return target_node.get_ancestors().values_list('pk', flat=True)

    def get_immediate_children_ids(self, target_node):
        """
        in tree order
        """
        return target_node.get_children().values_list('pk', flat=True)

    def get_preload(self, target_node):
        skip_list = []
        if 'skip_preload' in self.context:
            skip_list = self.context['skip_preload']

        immediate_children_list = []
        for cn in target_node.get_children().using(self.context['channel_id']).exclude(pk__in=skip_list):
            immediate_children_list.append(SimplifiedContentNodeSerializer(cn).data)

        ancestros_list = []
        for cn in target_node.get_ancestors().using(self.context['channel_id']).exclude(pk__in=skip_list):
            ancestros_list.append(SimplifiedContentNodeSerializer(cn).data)

        return {'ancestor': ancestros_list, 'immediate_children': immediate_children_list}

    class Meta:
        model = ContentNode
        depth = 1
        fields = (
            'pk', 'url', 'content_id', 'title', 'description', 'kind', 'available', 'tags', 'sort_order', 'license_owner',
            'license', 'parent', 'prerequisite', 'is_related', 'ancestor_topics', 'immediate_children', 'files',
            'leaves', 'all_prerequisites', 'all_related', 'missing_files', 'ancestor_ids', 'immediate_children_ids', 'preload'
        )

class SimplifiedContentNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentNode
        depth = 1
        fields = (
            'pk', 'content_id', 'title', 'description', 'kind', 'available', 'tags', 'sort_order', 'license_owner',
            'license', 'prerequisite', 'is_related', 'files'
        )


class FileSerializer(serializers.ModelSerializer):
    url = DualLookuplinkedIdentityField(
        view_name='file-detail',
        lookup_field_1='channelmetadata_channel_id',
        lookup_field_2='pk'
    )

    class Meta:
        model = File
        depth = 1
        fields = ('url', 'id', 'checksum', 'available', 'file_size', 'contentnode', 'extension', 'preset', 'lang', 'supplementary', 'thumbnail')
