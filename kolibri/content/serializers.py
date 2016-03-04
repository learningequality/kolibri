from models import ContentMetadata, File, Format
from rest_framework import serializers


class ContentMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentMetadata
        fields = ('content_id', 'title', 'description', 'kind', 'slug', 'total_file_size', 'available', 'license', 'prerequisite', 'is_related', 'parent')


class FormatSerializer(serializers.ModelSerializer):
    class Meta:
        model = Format
        fields = ('available', 'format_size', 'quality', 'contentmetadata', 'mimetype')


class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ('checksum', 'extension', 'available', 'file_size', 'content_copy', 'format')
