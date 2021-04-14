from le_utils.constants import content_kinds
from rest_framework import serializers

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.fields import create_timezonestamp


class DynamicFieldsModelSerializer(serializers.ModelSerializer):
    def __init__(self, *args, **kwargs):
        # Instantiate the superclass normally
        super(DynamicFieldsModelSerializer, self).__init__(*args, **kwargs)

        # enable dynamic fields specification!
        if "request" in self.context and self.context["request"].GET.get(
            "fields", None
        ):
            fields = self.context["request"].GET["fields"].split(",")
            # Drop any fields that are not specified in the `fields` argument.
            allowed = set(fields)
            existing = set(self.fields.keys())
            for field_name in existing - allowed:
                self.fields.pop(field_name)


class ChannelMetadataSerializer(serializers.ModelSerializer):
    root = serializers.PrimaryKeyRelatedField(read_only=True)
    lang_code = serializers.SerializerMethodField()
    lang_name = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()
    num_coach_contents = serializers.IntegerField(source="root.num_coach_contents")

    def get_lang_code(self, instance):
        if instance.root.lang is None:
            return None

        return instance.root.lang.lang_code

    def get_lang_name(self, instance):
        if instance.root.lang is None:
            return None

        return instance.root.lang.lang_name

    def get_available(self, instance):
        return instance.root.available

    class Meta:
        model = ChannelMetadata
        fields = (
            "author",
            "description",
            "tagline",
            "id",
            "last_updated",
            "lang_code",
            "lang_name",
            "name",
            "root",
            "thumbnail",
            "version",
            "available",
            "num_coach_contents",
            "public",
        )


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
        return super(LowerCaseField, self).to_representation(obj).lower()


class LanguageSerializer(serializers.ModelSerializer):
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


class ContentNodeGranularSerializer(serializers.ModelSerializer):
    num_coach_contents = serializers.SerializerMethodField()
    coach_content = serializers.SerializerMethodField()
    total_resources = serializers.SerializerMethodField()
    importable = serializers.SerializerMethodField()
    new_resource = serializers.SerializerMethodField()
    num_new_resources = serializers.SerializerMethodField()
    updated_resource = serializers.SerializerMethodField()
    is_leaf = serializers.SerializerMethodField()

    class Meta:
        model = ContentNode
        fields = (
            "id",
            "available",
            "coach_content",
            "importable",
            "is_leaf",
            "kind",
            "num_coach_contents",
            "on_device_resources",
            "title",
            "total_resources",
            "new_resource",
            "num_new_resources",
            "updated_resource",
        )

    @property
    def channel_stats(self):
        return self.context["channel_stats"]

    def get_total_resources(self, instance):
        # channel_stats is None for export
        if self.channel_stats is None:
            return instance.on_device_resources
        return self.channel_stats.get(instance.id, {"total_resources": 0})[
            "total_resources"
        ]

    def get_num_coach_contents(self, instance):
        # If for exporting, only show what is available on server. For importing,
        # show all of the coach contents in the topic.
        if self.channel_stats is None:
            return instance.num_coach_contents
        return self.channel_stats.get(instance.id, {"num_coach_contents": 0})[
            "num_coach_contents"
        ]

    def get_coach_content(self, instance):
        # If for exporting, only show what is on server. For importing,
        # show all of the coach contents in the topic.
        if self.channel_stats is None:
            return instance.coach_content
        return self.channel_stats.get(instance.id, {"coach_content": False})[
            "coach_content"
        ]

    def get_importable(self, instance):
        # If for export, just return None
        if self.channel_stats is None:
            return None
        return instance.id in self.channel_stats

    def get_new_resource(self, instance):
        # If for export, just return None
        if self.channel_stats is None:
            return None
        return self.channel_stats.get(instance.id, {}).get("new_resource", False)

    def get_num_new_resources(self, instance):
        # If for export, just return None
        if self.channel_stats is None:
            return None
        return self.channel_stats.get(instance.id, {}).get("num_new_resources", 0)

    def get_updated_resource(self, instance):
        # If for export, just return None
        if self.channel_stats is None:
            return None
        return self.channel_stats.get(instance.id, {}).get("updated_resource", False)

    def get_is_leaf(self, instance):
        return instance.kind != content_kinds.TOPIC
