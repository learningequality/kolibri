from models import ChannelMetadata, ContentMetadata, File, Format, License
from rest_framework import serializers


class ChannelMetadataSerializer(serializers.HyperlinkedModelSerializer):
    contentmetadatas = serializers.SerializerMethodField('get_all_content')

    def get_all_content(self, new_channel):
        try:
            all_content = ContentMetadataSerializer(ContentMetadata.objects.using(str(new_channel.channel_id)).all(), context=self.context, many=True).data
            return all_content
        except KeyError, e:
            return e.message

    class Meta:
        model = ChannelMetadata
        fields = ('channel_id', 'name', 'description', 'author', 'theme', 'subscribed', 'contentmetadatas')


class ContentMetadataSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = ContentMetadata
        fields = (
            'url', 'content_id', 'title', 'description', 'kind', 'slug', 'total_file_size', 'available', 'license', 'prerequisite', 'is_related', 'parent'
        )


class FormatSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = Format
        fields = ('available', 'format_size', 'quality', 'contentmetadata', 'mimetype')


class FileSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = File
        fields = ('checksum', 'extension', 'available', 'file_size', 'content_copy', 'format')


class LicenseSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = License
        fields = ('license_name',)
