from django.core.handlers.wsgi import WSGIRequest
from kolibri.content.models import ChannelMetadataCache, ContentNode, File
from rest_framework import serializers
from rest_framework.reverse import reverse

from .content_db_router import get_active_content_database


class ChannelMetadataCacheSerializer(serializers.ModelSerializer):

    url = serializers.SerializerMethodField()
    all_nodes_url = serializers.SerializerMethodField()
    root_node_url = serializers.SerializerMethodField()

    class Meta:
        model = ChannelMetadataCache
        fields = ('root_pk', 'channel_id', 'name', 'description', 'author', 'url', 'all_nodes_url', 'root_node_url')

    def get_url(self, channel):
        kwargs = {"pk": channel.channel_id}
        request = self.context.get('request', None)
        return reverse("channel-detail", kwargs=kwargs, request=request)

    def get_all_nodes_url(self, channel):
        kwargs = {"channel_id": channel.channel_id}
        request = self.context.get('request', None)
        return reverse("contentnode-list", kwargs=kwargs, request=request)

    def get_root_node_url(self, channel):
        kwargs = {"channel_id": channel.channel_id, "pk": channel.root_pk}
        request = self.context.get('request', None)
        return reverse("contentnode-detail", kwargs=kwargs, request=request)


class DualLookuplinkedIdentityField(serializers.HyperlinkedIdentityField):

    def to_representation(self, value):
        view_name = self.view_name
        kwargs = {"channel_id": get_active_content_database(), "pk": value.pk}
        request = self.context.get('request', None)

        return self.reverse(view_name, kwargs=kwargs, request=request)


class FileSerializer(serializers.ModelSerializer):
    url = DualLookuplinkedIdentityField(
        view_name='file-detail',
    )
    storage_url = serializers.SerializerMethodField()

    def get_storage_url(self, target_node):
        return target_node.get_url()

    class Meta:
        model = File
        depth = 1
        fields = ('url', 'storage_url', 'id', 'priority', 'checksum', 'available', 'file_size', 'extension', 'preset', 'lang', 'supplementary', 'thumbnail')


class ContentNodeSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(read_only=True)
    url = DualLookuplinkedIdentityField(
        view_name='contentnode-detail',
    )
    ancestor_topics = DualLookuplinkedIdentityField(
        view_name='contentnode-ancestor-topics',
    )
    immediate_children = DualLookuplinkedIdentityField(
        view_name='contentnode-immediate-children',
    )
    leaves = DualLookuplinkedIdentityField(
        view_name='contentnode-leaves',
    )
    all_prerequisites = DualLookuplinkedIdentityField(
        view_name='contentnode-all-prerequisites',
    )
    all_related = DualLookuplinkedIdentityField(
        view_name='contentnode-all-related',
    )
    missing_files = DualLookuplinkedIdentityField(
        view_name='contentnode-missing-files',
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
        return target_node.get_ancestors().values('pk', 'title')

    class Meta:
        model = ContentNode
        depth = 1
        fields = (
            'pk', 'url', 'instance_id', 'content_id', 'title', 'description', 'kind', 'available', 'tags', 'sort_order', 'license_owner',
            'license', 'prerequisite', 'is_related', 'ancestor_topics', 'immediate_children', 'files', 'leaves', 'all_prerequisites',
            'all_related', 'missing_files', 'ancestors', 'parent',
        )

class SimplifiedContentNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentNode
        depth = 1
        fields = (
            'pk', 'instance_id', 'content_id', 'title', 'description', 'kind', 'available', 'tags', 'sort_order', 'license_owner',
            'license', 'prerequisite', 'is_related', 'files'
        )
