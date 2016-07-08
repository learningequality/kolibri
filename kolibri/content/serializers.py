from kolibri.content.models import ChannelMetadataCache, ContentNode, File
from rest_framework import serializers


class ChannelMetadataCacheSerializer(serializers.ModelSerializer):

    class Meta:
        model = ChannelMetadataCache
        fields = ('root_pk', 'id', 'name', 'description', 'author')


class FileSerializer(serializers.ModelSerializer):
    storage_url = serializers.SerializerMethodField()

    def get_storage_url(self, target_node):
        return target_node.get_url()

    class Meta:
        model = File
        fields = ('storage_url', 'id', 'priority', 'checksum', 'available', 'file_size', 'extension', 'preset', 'lang', 'supplementary', 'thumbnail')


class ContentNodeSerializer(serializers.ModelSerializer):
    parent = serializers.PrimaryKeyRelatedField(read_only=True)

    # Here we use a FileSerializer instead just the files reverse FK is because we want to get the computed field storage_url
    # In order to improve performance in production, we should implement a client side method to calculate the file url using
    # extension and checksum field along with the setting.STORAGE_ROOT, which can be passed to front end at template boostrapping.
    files = FileSerializer(many=True, read_only=True)
    ancestors = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        # Instantiate the superclass normally
        super(ContentNodeSerializer, self).__init__(*args, **kwargs)

        # enable dynamic fields specification!
        if 'request' in self.context and self.context['request'].GET.get('fields', None):
            fields = self.context['request'].GET['fields'].split(',')
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

    def get_thumbnail(self, target_node):
        thumbnail_model = target_node.files.filter(thumbnail=True, available=True).first()
        return thumbnail_model.get_url() if thumbnail_model else None

    class Meta:
        model = ContentNode
        fields = (
            'pk', 'content_id', 'title', 'description', 'kind', 'available', 'tags', 'sort_order', 'license_owner',
            'license', 'files', 'ancestors', 'parent', 'thumbnail'
        )
