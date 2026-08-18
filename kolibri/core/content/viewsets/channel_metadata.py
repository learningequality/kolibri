from collections import defaultdict

from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models.aggregates import Count
from django.urls import reverse
from django.utils.decorators import method_decorator
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from le_utils.constants import content_kinds
from le_utils.constants import modalities
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.serializers import BooleanField
from rest_framework.serializers import CharField
from rest_framework.serializers import IntegerField
from rest_framework.serializers import ListField
from rest_framework.serializers import PrimaryKeyRelatedField

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.api import ValuesMethodField
from kolibri.core.content import models
from kolibri.core.content.utils.cache import public_metadata_cache
from kolibri.core.content.utils.cache import remote_metadata_cache
from kolibri.core.device.utils import allow_peer_unlisted_channel_import
from kolibri.core.serializers import DateTimeTzField
from kolibri.core.serializers import KolibriModelSerializer
from kolibri.core.serializers import SplitTextField

from .remote import RemoteViewSet


class ChannelMetadataFilter(FilterSet):
    available = BooleanFilter(method="filter_available", label="Available")
    contains_exercise = BooleanFilter(
        method="filter_contains_exercise", label="Has exercises"
    )
    contains_quiz = BooleanFilter(method="filter_contains_quiz", label="Has quizzes")

    class Meta:
        model = models.ChannelMetadata
        fields = ("available", "contains_exercise", "contains_quiz")

    def filter_contains_exercise(self, queryset, name, value):
        queryset = queryset.annotate(
            contains_exercise=Exists(
                models.ContentNode.objects.filter(
                    kind=content_kinds.EXERCISE,
                    available=True,
                    channel_id=OuterRef("id"),
                )
            )
        )

        return queryset.filter(contains_exercise=True)

    def filter_contains_quiz(self, queryset, name, value):
        if value:
            queryset = queryset.annotate(
                contains_quiz=Exists(
                    models.ContentNode.objects.filter(
                        modality=modalities.QUIZ,
                        available=True,
                        channel_id=OuterRef("id"),
                    )
                )
            )
            return queryset.filter(contains_quiz=True)
        return queryset

    def filter_available(self, queryset, name, value):
        return queryset.filter(root__available=value)


class BaseChannelMetadataSerializer(KolibriModelSerializer):
    root = PrimaryKeyRelatedField(read_only=True)
    available = BooleanField(source="root.available")
    num_coach_contents = IntegerField(source="root.num_coach_contents")
    lang_code = CharField(source="root.lang.lang_code")
    lang_name = CharField(source="root.lang.lang_name")
    # v2 must be a superset of the v1 public endpoint, which names this field
    # last_published (#9381).
    last_published = DateTimeTzField(source="last_updated")
    included_categories = SplitTextField()
    included_grade_levels = SplitTextField()
    included_languages = ListField(child=CharField(), read_only=True)

    class Meta:
        model = models.ChannelMetadata
        fields = (
            "author",
            "available",
            "description",
            "id",
            "included_categories",
            "included_grade_levels",
            "included_languages",
            "lang_code",
            "lang_name",
            "last_published",
            "last_updated",
            "name",
            "num_coach_contents",
            "public",
            "published_size",
            "root",
            "tagline",
            "thumbnail",
            "total_resource_count",
            "version",
        )


def _create_channel_thumbnail_url(channel_id):
    return reverse("kolibri:core:channel-thumbnail", args=[channel_id])


class ChannelMetadataSerializer(BaseChannelMetadataSerializer):
    # A URL: the base64 column inflated the library payload to 1.6MB (#12502).
    thumbnail = ValuesMethodField(sources=("id", "thumbnail"))

    def get_thumbnail(self, obj):
        return _create_channel_thumbnail_url(obj.id) if obj.thumbnail else ""


class BaseChannelMetadataMixin:
    filter_backends = (DjangoFilterBackend,)
    filterset_class = ChannelMetadataFilter

    serializer_class = BaseChannelMetadataSerializer

    # No SQL array aggregate preserves the SortedManyToManyField order, which
    # calculate_included_languages fills in descending content-node count.
    deferred_fields = ("included_languages",)

    def get_queryset(self):
        return models.ChannelMetadata.objects.all()

    def consolidate(self, items, queryset):
        channel_languages = (
            models.ChannelMetadata.included_languages.through.objects.filter(
                channelmetadata__in=queryset
            )
            .order_by("sort_value")
            .values_list("channelmetadata_id", "language_id")
        )
        included_languages = defaultdict(list)
        for channel_id, language_id in channel_languages:
            included_languages[channel_id].append(language_id)
        for item in items:
            item["included_languages"] = included_languages[item["id"]]
        return items

    @action(detail=False)
    def filter_options(self, request, **kwargs):
        channel_id = self.request.query_params.get("id")

        nodes = models.ContentNode.objects.filter(channel_id=channel_id)
        authors = (
            nodes.exclude(author="")
            .order_by("author")
            .values_list("author")
            .annotate(Count("author"))
        )
        kinds = nodes.order_by("kind").values_list("kind").annotate(Count("kind"))

        tag_nodes = models.ContentTag.objects.filter(
            tagged_content__channel_id=channel_id
        )
        tags = (
            tag_nodes.order_by("tag_name")
            .values_list("tag_name")
            .annotate(Count("tag_name"))
        )

        data = {
            "available_authors": dict(authors),
            "available_kinds": dict(kinds),
            "available_tags": dict(tags),
        }

        return Response(data)


@method_decorator(remote_metadata_cache, name="dispatch")
class ChannelMetadataViewSet(BaseChannelMetadataMixin, RemoteViewSet):
    serializer_class = ChannelMetadataSerializer


@method_decorator(public_metadata_cache, name="dispatch")
class PublicChannelMetadataViewSet(BaseChannelMetadataMixin, ReadOnlyValuesViewset):
    def get_queryset(self):
        queryset = super().get_queryset()
        if allow_peer_unlisted_channel_import():
            return queryset
        return queryset.filter(public=True)
