import re
from collections import OrderedDict

from django.db.models import Exists
from django.db.models import OuterRef
from django.utils.text import smart_split
from django.utils.text import unescape_string_literal
from django_filters.rest_framework import BaseInFilter
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import ChoiceFilter
from django_filters.rest_framework import FilterSet
from django_filters.rest_framework import NumberFilter
from django_filters.rest_framework import UUIDFilter
from le_utils.constants import content_kinds
from le_utils.constants import modalities
from rest_framework import filters
from rest_framework.response import Response
from rest_framework.serializers import CharField

from kolibri.core.content import models
from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.cache import get_course_ids
from kolibri.core.content.utils.search import get_available_metadata_labels
from kolibri.core.content.utils.stopwords import stopwords_set
from kolibri.core.utils.pagination import ValuesViewsetCursorPagination


class UUIDInFilter(BaseInFilter, UUIDFilter):
    pass


class CharInFilter(BaseInFilter, CharFilter):
    pass


class ChoiceInFilter(BaseInFilter, ChoiceFilter):
    pass


contentnode_filter_fields = [
    "parent",
    "parent__isnull",
    "modality",
    "prerequisite_for",
    "has_prerequisite",
    "related",
    "exclude_content_ids",
    "ids",
    "content_id",
    "channel_id",
    "kind",
    "include_coach_content",
    "kind_in",
    "contains_quiz",
    "grade_levels",
    "resource_types",
    "learning_activities",
    "accessibility_labels",
    "categories",
    "learner_needs",
    "channels",
    "languages",
    "tree_id",
    "lft__gt",
    "rght__lt",
    "exclude_course_ancestry",
]


class ContentNodeFilter(FilterSet):
    ids = UUIDInFilter(method="filter_ids")
    kind = ChoiceFilter(
        method="filter_kind",
        choices=(content_kinds.choices + (("content", "Resource"),)),
    )
    exclude_content_ids = CharFilter(method="filter_exclude_content_ids")
    kind_in = CharFilter(method="filter_kind_in")
    parent = UUIDFilter("parent")
    parent__isnull = BooleanFilter(field_name="parent", lookup_expr="isnull")
    include_coach_content = BooleanFilter(method="filter_include_coach_content")
    contains_quiz = BooleanFilter(method="filter_contains_quiz")
    grade_levels = CharFilter(method="bitmask_contains_and")
    resource_types = CharFilter(method="bitmask_contains_and")
    learning_activities = CharFilter(method="bitmask_contains_and")
    accessibility_labels = CharFilter(method="bitmask_contains_and")
    categories = CharFilter(method="bitmask_contains_and")
    learner_needs = CharFilter(method="bitmask_contains_and")
    channels = UUIDInFilter(field_name="channel_id")
    languages = CharInFilter(field_name="lang_id")
    lft__gt = NumberFilter(field_name="lft", lookup_expr="gt")
    rght__lt = NumberFilter(field_name="rght", lookup_expr="lt")
    authors = CharFilter(method="filter_by_authors")
    tags = CharFilter(method="filter_by_tags")
    descendant_of = UUIDFilter(method="filter_descendant_of")
    exclude_modalities = ChoiceInFilter(
        field_name="modality", choices=modalities.choices, exclude=True
    )
    exclude_course_ancestry = BooleanFilter(method="filter_exclude_course_ancestry")

    class Meta:
        model = models.ContentNode
        fields = contentnode_filter_fields

    def filter_exclude_course_ancestry(self, queryset, name, value):
        """
        Exclude any resources that are descended from a Course.
        :param queryset: ContentNode queryset to filter
        :param name: filter field name
        :param value: boolean indicating whether to apply the exclusion
        :return: filtered queryset excluding course descendants if value is True
        """
        if not value:
            return queryset
        has_course_ancestor = ContentNode.objects.filter(
            id__in=get_course_ids(),
            lft__lt=OuterRef("lft"),
            rght__gt=OuterRef("rght"),
            tree_id=OuterRef("tree_id"),
        )
        return queryset.exclude(Exists(has_course_ancestor))

    def filter_ids(self, queryset, name, value):
        return queryset.filter_by_uuids(value)

    def filter_by_authors(self, queryset, name, value):
        """
        Show content filtered by author

        :param queryset: all content nodes for this channel
        :param value: an array of authors to filter by
        :return: content nodes that match the authors
        """
        authors = value.split(",")
        return queryset.filter(author__in=authors).order_by("lft")

    def filter_by_tags(self, queryset, name, value):
        """
        Show content filtered by tag

        :param queryset: all content nodes for this channel
        :param value: an array of tags to filter by
        :return: content nodes that match the tags
        """
        tags = value.split(",")
        return queryset.filter(tags__tag_name__in=tags).order_by("lft").distinct()

    def filter_descendant_of(self, queryset, name, value):
        """
        Show content that is descendant of the given node

        :param queryset: all content nodes for this channel
        :param value: the root node to filter descendant of
        :return: all descendants content
        """
        try:
            node = models.ContentNode.objects.values("lft", "rght", "tree_id").get(
                pk=value
            )
        except (models.ContentNode.DoesNotExist, ValueError):
            return queryset.none()
        return queryset.filter(
            lft__gt=node["lft"], rght__lt=node["rght"], tree_id=node["tree_id"]
        )

    def filter_kind(self, queryset, name, value):
        """
        Show only content of a given kind.

        :param queryset: all content nodes for this channel
        :param value: 'content' for everything except topics, or one of the content kind constants
        :return: content nodes of the given kind
        """
        if value == "content":
            return queryset.exclude(kind=content_kinds.TOPIC).order_by("lft")
        return queryset.filter(kind=value).order_by("lft")

    def filter_kind_in(self, queryset, name, value):
        """
        Show only content of given kinds.

        :param queryset: all content nodes for this channel
        :param value: A list of content node kinds
        :return: content nodes of the given kinds
        """
        kinds = value.split(",")
        return queryset.filter(kind__in=kinds).order_by("lft")

    def filter_exclude_content_ids(self, queryset, name, value):
        if not value:
            return queryset
        else:
            return queryset.exclude_by_content_ids(value.split(","))

    def filter_include_coach_content(self, queryset, name, value):
        if value:
            return queryset
        return queryset.filter(coach_content=False)

    def filter_contains_quiz(self, queryset, name, value):
        if value:
            # A correlated descendant subquery, not get_ancestors() over the
            # quizzes: the latter made this filter unusably slow (#13267).
            quiz_descendants = models.ContentNode.objects.filter(
                modality=modalities.QUIZ,
                available=True,
                tree_id=OuterRef("tree_id"),
                lft__gte=OuterRef("lft"),
                rght__lte=OuterRef("rght"),
            )
            return queryset.alias(_has_quiz=Exists(quiz_descendants)).filter(
                _has_quiz=True
            )
        return queryset

    def bitmask_contains_and(self, queryset, name, value):
        return queryset.has_all_labels(name, value.split(","))


def search_smart_split(search_terms):
    """
    Returns sanitized search terms as a list.
    Vendored and modified from https://github.com/encode/django-rest-framework/blob/main/rest_framework/filters.py#L23
    to add splitting by more punctuation types.
    """
    split_terms = []
    for term in smart_split(search_terms):
        # trim commas to avoid bad matching for quoted phrases
        term = term.strip(",")
        if term.startswith(('"', "'")) and term[0] == term[-1]:
            # quoted phrases are kept together without any other split
            split_terms.append(unescape_string_literal(term))
        else:
            # non-quoted tokens are split by ?.,!;, keeping only non-empty ones
            for sub_term in re.split("[?.,!;:]", term):
                if sub_term:
                    split_terms.append(sub_term.strip())
    return split_terms


class ContentNodeSearchFilter(filters.SearchFilter):
    search_param = "search"

    def get_search_fields(self, view, request):
        return ["title", "description"]

    def get_cleaned_search_value(self, request):
        value = request.query_params.get(
            self.search_param,
            request.query_params.get(
                "question", request.query_params.get("keywords", "")
            ),
        )
        field = CharField(trim_whitespace=False, allow_blank=True)
        return field.run_validation(value)

    def get_search_terms(self, request):
        """
        Search terms are set by a ?search=... query parameter,
        and may be whitespace delimited.
        For backwards compatibility, we also allow the question and keywords
        parameters, but search will take precedence.
        """
        cleaned_value = self.get_cleaned_search_value(request)
        split_terms = search_smart_split(cleaned_value)
        critical_terms = [w for w in split_terms if w not in stopwords_set]
        return critical_terms if critical_terms else split_terms


class OptionalPagination(ValuesViewsetCursorPagination):
    ordering = ("lft", "id")
    page_size_query_param = "max_results"


class OptionalContentNodePagination(OptionalPagination):
    # Local search no longer offers a channel filter, so the channels label set
    # is dead weight here (#12842).
    use_deprecated_channels_labels = False

    def paginate_queryset(self, queryset, request, view=None):
        # Record the queryset for use in returning available filters
        self.queryset = queryset
        return super().paginate_queryset(queryset, request, view=view)

    def get_paginated_response(self, data):
        return Response(
            OrderedDict(
                [
                    ("more", self.get_more()),
                    ("results", data),
                    (
                        "labels",
                        get_available_metadata_labels(
                            self.queryset, self.use_deprecated_channels_labels
                        ),
                    ),
                ]
            )
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "more": {
                    "type": "object",
                    "nullable": True,
                    "example": {
                        "cursor": "asdadshjashjadh",
                    },
                },
                "results": schema,
                "labels": {
                    "type": "object",
                    "example": {"accessibility_labels": ["id1", "id2"]},
                },
            },
        }


class PublicContentNodePagination(OptionalContentNodePagination):
    # 0.17.x peers browsing this device remotely still offer that filter, so the
    # public endpoint must keep emitting the labels (#12842).
    use_deprecated_channels_labels = True
