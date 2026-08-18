from rest_framework import serializers

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.fields import create_timezonestamp


class PublicChannelSerializer(serializers.ModelSerializer):
    included_languages = serializers.SerializerMethodField()
    matching_tokens = serializers.SerializerMethodField("match_tokens")
    language = serializers.SerializerMethodField()
    icon_encoding = serializers.SerializerMethodField()
    last_published = serializers.SerializerMethodField()

    def get_language(self, instance):
        if instance.root.lang is None:
            return None

        return instance.root.lang.lang_code

    def get_icon_encoding(self, instance):
        return instance.thumbnail

    def get_included_languages(self, instance):
        return list(instance.included_languages.all().values_list("id", flat=True))

    def get_last_published(self, instance):
        return (
            None
            if not instance.last_updated
            else create_timezonestamp(instance.last_updated)
        )

    def match_tokens(self, channel):
        return []

    class Meta:
        model = ChannelMetadata
        fields = (
            "id",
            "name",
            "language",
            "included_languages",
            "description",
            "tagline",
            "total_resource_count",
            "version",
            "published_size",
            "last_published",
            "icon_encoding",
            "matching_tokens",
            "public",
        )


class LowerCaseField(serializers.CharField):
    def to_representation(self, obj):
        return super().to_representation(obj).lower()


class LanguageSerializer(serializers.ModelSerializer):
    # le_utils ids carry uppercase region subtags (en-GB, pt-BR); the frontend
    # keys its language lookups by the lowercase id (#1869).
    id = LowerCaseField(max_length=14)
    lang_code = LowerCaseField(max_length=3)
    lang_subcode = LowerCaseField(max_length=10)

    class Meta:
        model = Language
        fields = ("id", "lang_code", "lang_subcode", "lang_name", "lang_direction")


class FileSerializer(serializers.ModelSerializer):
    checksum = serializers.CharField(source="local_file_id")
    storage_url = serializers.SerializerMethodField()
    extension = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    lang = LanguageSerializer()
    available = serializers.BooleanField(source="local_file.available")

    def get_storage_url(self, target_node):
        return target_node.get_storage_url()

    def get_extension(self, target_node):
        return target_node.get_extension()

    def get_file_size(self, target_node):
        return target_node.get_file_size()

    class Meta:
        model = File
        fields = (
            "storage_url",
            "id",
            "priority",
            "available",
            "file_size",
            "extension",
            "checksum",
            "preset",
            "lang",
            "supplementary",
            "thumbnail",
        )
