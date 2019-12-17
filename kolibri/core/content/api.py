import logging
import re
from functools import reduce
from random import sample

import requests
from django.core.cache import cache
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Sum
from django.db.models.aggregates import Count
from django.http import Http404
from django.http.request import HttpRequest
from django.utils.cache import patch_response_headers
from django.utils.decorators import method_decorator
from django.utils.translation import ugettext as _
from django.views.decorators.http import etag
from django_filters.rest_framework import BooleanFilter
from django_filters.rest_framework import CharFilter
from django_filters.rest_framework import ChoiceFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters.rest_framework import FilterSet
from le_utils.constants import content_kinds
from le_utils.constants import languages
from rest_framework import mixins
from rest_framework import pagination
from rest_framework import viewsets
from rest_framework.decorators import detail_route
from rest_framework.decorators import list_route
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from kolibri.core.api import ValuesViewset
from kolibri.core.auth.constants import user_kinds
from kolibri.core.content import models
from kolibri.core.content import serializers
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_disk,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_peer,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_studio,
)
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_info_url
from kolibri.core.content.utils.paths import get_local_content_storage_file_url
from kolibri.core.content.utils.stopwords import stopwords_set
from kolibri.core.decorators import query_params_required
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.query import SQSum

logger = logging.getLogger(__name__)


def cache_forever(some_func):
    """
    Decorator for patch_response_headers function
    """
    # Approximately 1 year
    # Source: https://stackoverflow.com/a/3001556/405682
    cache_timeout = 31556926

    def wrapper_func(*args, **kwargs):
        response = some_func(*args, **kwargs)
        # This caching has the unfortunate effect of also caching the dynamically
        # generated filters for recommendation, this quick hack checks if
        # the request is any of those filters, and then applies less long running
        # caching on it.
        timeout = cache_timeout
        try:
            request = args[0]
            request = kwargs.get("request", request)
        except IndexError:
            request = kwargs.get("request", None)
        if isinstance(request, HttpRequest):
            if any(
                map(lambda x: x in request.path, ["popular", "next_steps", "resume"])
            ):
                timeout = 600
        patch_response_headers(response, cache_timeout=timeout)
        return response

    return wrapper_func


class ChannelMetadataFilter(FilterSet):
    available = BooleanFilter(method="filter_available", label="Available")
    has_exercise = BooleanFilter(method="filter_has_exercise", label="Has exercises")

    class Meta:
        model = models.ChannelMetadata
        fields = ("available", "has_exercise")

    def filter_has_exercise(self, queryset, name, value):
        queryset = queryset.annotate(
            has_exercise=Exists(
                models.ContentNode.objects.filter(
                    kind=content_kinds.EXERCISE,
                    available=True,
                    channel_id=OuterRef("id"),
                )
            )
        )

        return queryset.filter(has_exercise=True)

    def filter_available(self, queryset, name, value):
        return queryset.filter(root__available=value)


@method_decorator(cache_forever, name="dispatch")
class ChannelMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ChannelMetadataSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelMetadataFilter

    def get_queryset(self):
        return models.ChannelMetadata.objects.all().select_related("root__lang")


class IdFilter(FilterSet):
    ids = CharFilter(method="filter_ids")

    def filter_ids(self, queryset, name, value):
        return queryset.filter_by_uuids(value.split(","))

    class Meta:
        fields = ["ids"]


class ContentNodeFilter(IdFilter):
    recommendations_for = CharFilter(method="filter_recommendations_for")
    next_steps = CharFilter(method="filter_next_steps")
    popular = CharFilter(method="filter_popular")
    resume = CharFilter(method="filter_resume")
    kind = ChoiceFilter(
        method="filter_kind",
        choices=(content_kinds.choices + (("content", _("Content")),)),
    )
    user_kind = ChoiceFilter(method="filter_user_kind", choices=user_kinds.choices)
    in_lesson = CharFilter(method="filter_in_lesson")
    in_exam = CharFilter(method="filter_in_exam")
    exclude_content_ids = CharFilter(method="filter_exclude_content_ids")
    kind_in = CharFilter(method="filter_kind_in")

    class Meta:
        model = models.ContentNode
        fields = [
            "parent",
            "prerequisite_for",
            "has_prerequisite",
            "related",
            "exclude_content_ids",
            "recommendations_for",
            "next_steps",
            "popular",
            "resume",
            "ids",
            "content_id",
            "channel_id",
            "kind",
            "user_kind",
            "kind_in",
        ]

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

    def filter_user_kind(self, queryset, name, value):
        """
        Show coach_content if they have coach role or higher.
        This could be extended if we add other 'content role' types

        :param queryset: content nodes
        :param value: user_kind
        :return: content nodes filtered by coach_content if appropiate
        """
        if value not in [
            user_kinds.ADMIN,
            user_kinds.SUPERUSER,
            user_kinds.COACH,
            user_kinds.ASSIGNABLE_COACH,
        ]:
            # Exclude nodes that are coach content
            queryset = queryset.exclude(coach_content=True)
        return queryset

    def filter_exclude_content_ids(self, queryset, name, value):
        return queryset.exclude_by_content_ids(value.split(","))


class OptionalPageNumberPagination(pagination.PageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """

    page_size = None
    page_size_query_param = "page_size"


@method_decorator(cache_forever, name="dispatch")
class ContentNodeViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ContentNodeSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    pagination_class = OptionalPageNumberPagination

    def prefetch_related(self, queryset):
        return queryset.prefetch_related(
            "assessmentmetadata", "files", "files__local_file"
        ).select_related("lang")

    def get_queryset(self, prefetch=True):
        queryset = models.ContentNode.objects.filter(available=True)
        if prefetch:
            return self.prefetch_related(queryset)
        return queryset

    def get_object(self, prefetch=True):
        """
        Returns the object the view is displaying.
        You may want to override this if you need to provide non-standard
        queryset lookups.  Eg if objects are referenced using multiple
        keyword arguments in the url conf.
        """
        queryset = self.filter_queryset(self.get_queryset(prefetch=prefetch))

        # Perform the lookup filtering.
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field

        assert lookup_url_kwarg in self.kwargs, (
            "Expected view %s to be called with a URL keyword argument "
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            "attribute on the view correctly."
            % (self.__class__.__name__, lookup_url_kwarg)
        )

        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj

    @list_route(methods=["get"])
    def descendants(self, request):
        """
        Returns a slim view all the descendants of a set of content nodes (as designated by the passed in ids).
        In addition to id, title, kind, and content_id, each node is also annotated with the ancestor_id of one
        of the ids that are passed into the request.
        In the case where a node has more than one ancestor in the set of content nodes requested, duplicates of
        that content node are returned, each annotated with one of the ancestor_ids for a node.
        """
        ids = self.request.query_params.get("ids", None)
        if not ids:
            return Response([])
        ids = ids.split(",")
        kind = self.request.query_params.get("descendant_kind", None)
        nodes = models.ContentNode.objects.filter_by_uuids(ids).filter(available=True)
        data = []
        for node in nodes:

            def copy_node(new_node):
                new_node["ancestor_id"] = node.id
                return new_node

            node_data = node.get_descendants().filter(available=True)
            if kind:
                node_data = node_data.filter(kind=kind)
            data += map(
                copy_node, node_data.values("id", "title", "kind", "content_id")
            )
        return Response(data)

    @list_route(methods=["get"])
    def descendants_assessments(self, request):
        ids = self.request.query_params.get("ids", None)
        if not ids:
            return Response([])
        ids = ids.split(",")
        queryset = models.ContentNode.objects.filter_by_uuids(ids).filter(
            available=True
        )
        data = list(
            queryset.annotate(
                num_assessments=SQSum(
                    models.ContentNode.objects.filter(
                        tree_id=OuterRef("tree_id"),
                        lft__gte=OuterRef("lft"),
                        lft__lt=OuterRef("rght"),
                        kind=content_kinds.EXERCISE,
                        available=True,
                    ).values_list(
                        "assessmentmetadata__number_of_assessments", flat=True
                    ),
                    field="number_of_assessments",
                )
            ).values("id", "num_assessments")
        )
        return Response(data)

    @list_route(methods=["get"])
    def node_assessments(self, request):
        ids = self.request.query_params.get("ids", "").split(",")
        data = 0
        if ids and ids[0]:
            nodes = (
                models.ContentNode.objects.filter_by_uuids(ids)
                .filter(available=True)
                .prefetch_related("assessmentmetadata")
            )
            data = (
                nodes.aggregate(Sum("assessmentmetadata__number_of_assessments"))[
                    "assessmentmetadata__number_of_assessments__sum"
                ]
                or 0
            )
        return Response(data)

    @detail_route(methods=["get"])
    def copies(self, request, pk=None):
        """
        Returns each nodes that has this content id, along with their ancestors.
        """
        # let it be noted that pk is actually the content id in this case
        cache_key = "contentnode_copies_ancestors_{content_id}".format(content_id=pk)

        if cache.get(cache_key) is not None:
            return Response(cache.get(cache_key))

        copies = []
        nodes = models.ContentNode.objects.filter(content_id=pk, available=True)
        for node in nodes:
            copies.append(node.get_ancestors(include_self=True).values("id", "title"))

        cache.set(cache_key, copies, 60 * 10)
        return Response(copies)

    @list_route(methods=["get"])
    def copies_count(self, request, **kwargs):
        """
        Returns the number of node copies for each content id.
        """
        content_id_string = self.request.query_params.get("content_ids")
        if content_id_string:
            content_ids = content_id_string.split(",")
            counts = (
                models.ContentNode.objects.filter_by_content_ids(content_ids)
                .filter(available=True)
                .values("content_id")
                .order_by()
                .annotate(count=Count("content_id"))
            )
        else:
            counts = 0
        return Response(counts)

    @detail_route(methods=["get"])
    def next_content(self, request, **kwargs):
        # retrieve the "next" content node, according to depth-first tree traversal
        this_item = self.get_object()
        next_item = (
            models.ContentNode.objects.filter(
                available=True, tree_id=this_item.tree_id, lft__gt=this_item.rght
            )
            .order_by("lft")
            .first()
        )
        if not next_item:
            next_item = this_item.get_root()

        thumbnails = serializers.FileSerializer(
            next_item.files.filter(thumbnail=True), many=True
        ).data
        if thumbnails:
            return Response(
                {
                    "kind": next_item.kind,
                    "id": next_item.id,
                    "title": next_item.title,
                    "thumbnail": thumbnails[0]["storage_url"],
                }
            )
        return Response(
            {"kind": next_item.kind, "id": next_item.id, "title": next_item.title}
        )


def process_thumbnail(obj):
    file = {}
    file["id"] = obj.pop("file_id")
    file["extension"] = obj.pop("file_extension")
    file["available"] = obj.pop("file_available")
    file["thumbnail"] = obj.pop("file_thumbnail")
    file["storage_url"] = get_local_content_storage_file_url(file)
    if file["id"] is not None:
        return [file]
    else:
        return []


@method_decorator(cache_forever, name="dispatch")
class ContentNodeSlimViewset(ValuesViewset):
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    pagination_class = OptionalPageNumberPagination
    values = (
        "id",
        "parent",
        "description",
        "channel_id",
        "content_id",
        "kind",
        "title",
        "num_coach_contents",
        "file_thumbnail",
        "file_id",
        "file_extension",
        "file_available",
    )

    field_map = {"files": process_thumbnail}

    def annotate_queryset(self, queryset):
        thumbnail_query = models.File.objects.filter(
            contentnode=OuterRef("id"), thumbnail=True
        ).order_by()
        return queryset.annotate(
            file_thumbnail=Subquery(
                thumbnail_query.values_list("thumbnail", flat=True)[:1]
            ),
            file_id=Subquery(
                thumbnail_query.values_list("local_file__id", flat=True)[:1]
            ),
            file_extension=Subquery(
                thumbnail_query.values_list("local_file__extension", flat=True)[:1]
            ),
            file_available=Subquery(
                thumbnail_query.values_list("local_file__available", flat=True)[:1]
            ),
        )

    def get_queryset(self):
        return models.ContentNode.objects.filter(available=True)

    @detail_route(methods=["get"])
    def ancestors(self, request, **kwargs):
        cache_key = "contentnode_slim_ancestors_{pk}".format(pk=kwargs.get("pk"))

        if cache.get(cache_key) is not None:
            return Response(cache.get(cache_key))

        ancestors = list(self.get_object().get_ancestors().values("id", "title"))

        cache.set(cache_key, ancestors, 60 * 10)

        return Response(ancestors)

    @detail_route(methods=["get"])
    def recommendations_for(self, request, **kwargs):
        """
        Recommend items that are similar to this piece of content.
        """
        queryset = self.filter_queryset(self.get_queryset())
        pk = kwargs.get("pk", None)
        node = get_object_or_404(queryset, pk=pk)
        queryset = self.filter_queryset(self.get_queryset())
        queryset = self.prefetch_queryset(
            queryset
            & node.get_siblings(include_self=False).exclude(kind=content_kinds.TOPIC)
        )
        return Response(self.serialize(queryset))

    @detail_route(methods=["get"])
    def next_steps(self, request, **kwargs):
        """
        Recommend content that has user completed content as a prerequisite, or leftward sibling.
        Note that this is a slightly smelly use of a detail route, as the id in question is not for
        a contentnode, but rather for a user. Recommend we move recommendation endpoints to their own
        endpoints in future.

        :param request: request object
        :param pk: id of the user whose recommendations they are
        :return: uncompleted content nodes, or empty queryset if user is anonymous
        """
        user = request.user
        user_id = kwargs.get("pk", None)
        queryset = self.prefetch_queryset(self.get_queryset())
        # if user is anonymous, don't return any nodes
        # if person requesting is not the data they are requesting for, also return no nodes
        if not user.is_facility_user or user.id != user_id:
            queryset = queryset.none()
        else:
            completed_content_ids = ContentSummaryLog.objects.filter(
                user=user, progress=1
            ).values_list("content_id", flat=True)

            # If no logs, don't bother doing the other queries
            if not completed_content_ids.exists():
                queryset = queryset.none()
            else:
                completed_content_nodes = queryset.filter_by_content_ids(
                    completed_content_ids
                ).order_by()

                # Filter to only show content that the user has not engaged in, so as not to be redundant with resume
                queryset = (
                    queryset.exclude_by_content_ids(
                        ContentSummaryLog.objects.filter(user=user).values_list(
                            "content_id", flat=True
                        ),
                        validate=False,
                    )
                    .filter(
                        Q(has_prerequisite__in=completed_content_nodes)
                        | Q(
                            lft__in=[
                                rght + 1
                                for rght in completed_content_nodes.values_list(
                                    "rght", flat=True
                                )
                            ]
                        )
                    )
                    .order_by()
                )
                if not (
                    user.roles.exists() or user.is_superuser
                ):  # must have coach role or higher
                    queryset = queryset.exclude(coach_content=True)

        return Response(self.serialize(queryset))

    @list_route(methods=["get"])
    def popular(self, request, **kwargs):
        """
        Recommend content that is popular with all users.

        :param request: request object
        :return: 10 most popular content nodes
        """
        cache_key = "popular_content"
        coach_content = False

        user = request.user
        if user.is_facility_user:  # exclude anon users
            if (
                user.roles.exists() or user.is_superuser
            ):  # must have coach role or higher
                cache_key = "popular_content_coach"
                coach_content = True

        if cache.get(cache_key) is not None:
            return Response(cache.get(cache_key))

        queryset = self.prefetch_queryset(self.get_queryset())

        if ContentSessionLog.objects.count() < 50:
            # return 25 random content nodes if not enough session logs
            pks = queryset.values_list("pk", flat=True).exclude(
                kind=content_kinds.TOPIC
            )
            # .count scales with table size, so can get slow on larger channels
            count_cache_key = "content_count_for_popular"
            count = cache.get(count_cache_key) or min(pks.count(), 25)
            queryset = queryset.filter_by_uuids(
                sample(list(pks), count), validate=False
            )
            if not coach_content:
                queryset = queryset.exclude(coach_content=True)
        else:
            # get the most accessed content nodes
            # search for content nodes that currently exist in the database
            content_nodes = models.ContentNode.objects.filter(available=True)
            if not coach_content:
                content_nodes = content_nodes.exclude(coach_content=True)
            content_counts_sorted = (
                ContentSessionLog.objects.filter(
                    content_id__in=content_nodes.values_list(
                        "content_id", flat=True
                    ).distinct()
                )
                .values_list("content_id", flat=True)
                .annotate(Count("content_id"))
                .order_by("-content_id__count")
            )

            most_popular = queryset.filter_by_content_ids(
                list(content_counts_sorted[:20]), validate=False
            )
            queryset = most_popular.dedupe_by_content_id()

        data = self.serialize(queryset)

        # cache the popular results queryset for 10 minutes, for efficiency
        cache.set(cache_key, data, 60 * 10)

        return Response(data)

    @detail_route(methods=["get"])
    def resume(self, request, **kwargs):
        """
        Recommend content that the user has recently engaged with, but not finished.
        Note that this is a slightly smelly use of a detail route, as the id in question is not for
        a contentnode, but rather for a user. Recommend we move recommendation endpoints to their own
        endpoints in future.

        :param request: request object
        :param pk: id of the user whose recommendations they are
        :return: 10 most recently viewed content nodes
        """
        user = request.user
        user_id = kwargs.get("pk", None)
        queryset = self.prefetch_queryset(self.get_queryset())
        # if user is anonymous, don't return any nodes
        # if person requesting is not the data they are requesting for, also return no nodes
        if not user.is_facility_user or user.id != user_id:
            queryset = queryset.none()
        else:
            # get the most recently viewed, but not finished, content nodes
            # search for content nodes that currently exist in the database
            content_ids = (
                ContentSummaryLog.objects.filter(
                    content_id__in=models.ContentNode.objects.values_list(
                        "content_id", flat=True
                    ).distinct()
                )
                .filter(user=user)
                .exclude(progress=1)
                .order_by("end_timestamp")
                .values_list("content_id", flat=True)
                .distinct()
            )

            # If no logs, don't bother doing the other queries
            if not content_ids:
                queryset = queryset.none()
            else:
                resume = queryset.filter_by_content_ids(
                    list(content_ids[:10]), validate=False
                )
                queryset = resume.dedupe_by_content_id()

        return Response(self.serialize(queryset))


# return the result of and-ing a list of queries
def intersection(queries):
    if queries:
        return reduce(lambda x, y: x & y, queries)
    return None


def union(queries):
    if queries:
        return reduce(lambda x, y: x | y, queries)
    return None


@query_params_required(search=str, max_results=int, max_results__default=30)
class ContentNodeSearchViewset(ContentNodeSlimViewset):
    def search(self, value, max_results, filter=True):
        """
        Implement various filtering strategies in order to get a wide range of search results.
        When filter is used, this object must have a request attribute having
        a 'query_params' QueryDict containing the filters to be applied
        """
        if filter:
            queryset = self.filter_queryset(self.get_queryset())
        else:
            queryset = self.get_queryset()
        # all words with punctuation removed
        all_words = [w for w in re.split('[?.,!";: ]', value) if w]
        # words in all_words that are not stopwords
        critical_words = [w for w in all_words if w not in stopwords_set]
        # queries ordered by relevance priority
        all_queries = [
            # all words in title
            intersection([Q(title__icontains=w) for w in all_words]),
            # all critical words in title
            intersection([Q(title__icontains=w) for w in critical_words]),
            # all words in description
            intersection([Q(description__icontains=w) for w in all_words]),
            # all critical words in description
            intersection([Q(description__icontains=w) for w in critical_words]),
        ]
        # any critical word in title, reverse-sorted by word length
        for w in sorted(critical_words, key=len, reverse=True):
            all_queries.append(Q(title__icontains=w))
        # any critical word in description, reverse-sorted by word length
        for w in sorted(critical_words, key=len, reverse=True):
            all_queries.append(Q(description__icontains=w))

        # only execute if query is meaningful
        all_queries = [query for query in all_queries if query]

        results = []
        content_ids = set()
        BUFFER_SIZE = max_results * 2  # grab some extras, but not too many

        # iterate over each query type, and build up search results
        for query in all_queries:

            # in each pass, don't take any items already in the result set
            matches = (
                queryset.exclude_by_content_ids(list(content_ids), validate=False)
                .filter(query)
                .values("content_id", "id")[:BUFFER_SIZE]
            )

            for match in matches:
                # filter the dupes
                if match["content_id"] in content_ids:
                    continue
                # add new, unique results
                content_ids.add(match["content_id"])
                results.append(match["id"])

                # bail out as soon as we reach the quota
                if len(results) >= max_results:
                    break
            # bail out as soon as we reach the quota
            if len(results) >= max_results:
                break

        results = queryset.filter_by_uuids(results, validate=False)

        # If no queries, just use an empty Q.
        all_queries_filter = union(all_queries) or Q()

        total_results = (
            queryset.filter(all_queries_filter)
            .values_list("content_id", flat=True)
            .distinct()
            .count()
        )

        # Use unfiltered queryset to collect channel_ids and kinds metadata.
        unfiltered_queryset = self.get_queryset()

        channel_ids = (
            unfiltered_queryset.filter(all_queries_filter)
            .values_list("channel_id", flat=True)
            .order_by("channel_id")
            .distinct()
        )

        content_kinds = (
            unfiltered_queryset.filter(all_queries_filter)
            .values_list("kind", flat=True)
            .order_by("kind")
            .distinct()
        )

        return (results, channel_ids, content_kinds, total_results)

    def list(self, request, **kwargs):
        value = self.kwargs["search"]
        max_results = self.kwargs["max_results"]
        results, channel_ids, content_kinds, total_results = self.search(
            value, max_results
        )
        data = self.serialize(results)
        return Response(
            {
                "channel_ids": channel_ids,
                "content_kinds": content_kinds,
                "results": data,
                "total_results": total_results,
            }
        )


def get_cache_key(*args, **kwargs):
    return str(ContentCacheKey.get_cache_key())


@method_decorator(etag(get_cache_key), name="retrieve")
class ContentNodeGranularViewset(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = serializers.ContentNodeGranularSerializer

    def get_queryset(self):
        return (
            models.ContentNode.objects.all()
            .prefetch_related("files__local_file")
            .filter(renderable_contentnodes_q_filter)
            .distinct()
        )

    def get_serializer_context(self):
        context = super(ContentNodeGranularViewset, self).get_serializer_context()
        context.update({"channel_stats": self.channel_stats})
        return context

    def retrieve(self, request, pk):
        queryset = self.get_queryset()
        instance = get_object_or_404(queryset, pk=pk)
        channel_id = instance.channel_id
        drive_id = self.request.query_params.get("importing_from_drive_id", None)
        peer_id = self.request.query_params.get("importing_from_peer_id", None)
        for_export = self.request.query_params.get("for_export", None)
        flag_count = sum(int(bool(flag)) for flag in (drive_id, peer_id, for_export))
        if flag_count > 1:
            raise serializers.ValidationError(
                "Must specify at most one of importing_from_drive_id, importing_from_peer_id, and for_export"
            )
        if not flag_count:
            self.channel_stats = get_channel_stats_from_studio(channel_id)
        if for_export:
            self.channel_stats = None
        if drive_id:
            try:
                self.channel_stats = get_channel_stats_from_disk(channel_id, drive_id)
            except LocationError:
                raise serializers.ValidationError(
                    "The external drive with given drive id {} does not exist.".format(
                        drive_id
                    )
                )
        if peer_id:
            try:
                self.channel_stats = get_channel_stats_from_peer(channel_id, peer_id)
            except LocationError:
                raise serializers.ValidationError(
                    "The network location with the id {} does not exist".format(peer_id)
                )
        children = queryset.filter(parent=instance)
        parent_serializer = self.get_serializer(instance)
        parent_data = parent_serializer.data
        child_serializer = self.get_serializer(children, many=True)
        parent_data["children"] = child_serializer.data

        return Response(parent_data)


class ContentNodeProgressFilter(IdFilter):
    class Meta:
        model = models.ContentNode
        fields = ["ids"]


class ContentNodeProgressViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ContentNodeProgressSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeProgressFilter

    def get_queryset(self):
        return models.ContentNode.objects.all()


class FileViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.FileSerializer
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        return models.File.objects.all()


class RemoteChannelViewSet(viewsets.ViewSet):
    permission_classes = (CanManageContent,)

    http_method_names = ["get"]

    def _make_channel_endpoint_request(
        self, identifier=None, baseurl=None, keyword=None, language=None
    ):

        url = get_channel_lookup_url(
            identifier=identifier, baseurl=baseurl, keyword=keyword, language=language
        )

        resp = requests.get(url)

        if resp.status_code == 404:
            raise Http404(
                _("The requested channel does not exist on the content server")
            )

        # map the channel list into the format the Kolibri client-side expects
        channels = list(map(self._studio_response_to_kolibri_response, resp.json()))

        return Response(channels)

    @staticmethod
    def _get_lang_native_name(code):
        try:
            lang_name = languages.getlang(code).native_name
        except AttributeError:
            logger.warning(
                "Did not find language code {} in our le_utils.constants!".format(code)
            )
            lang_name = None

        return lang_name

    @classmethod
    def _studio_response_to_kolibri_response(cls, studioresp):
        """
        This modifies the JSON response returned by Kolibri Studio,
        and then transforms its keys that are more in line with the keys
        we return with /api/channels.
        """

        # See the spec at:
        # https://docs.google.com/document/d/1FGR4XBEu7IbfoaEy-8xbhQx2PvIyxp0VugoPrMfo4R4/edit#

        # Go through the channel's included_languages and add in the native name
        # for each language
        included_languages = {}
        for code in studioresp.get("included_languages", []):
            included_languages[code] = cls._get_lang_native_name(code)

        channel_lang_name = cls._get_lang_native_name(studioresp.get("language"))

        resp = {
            "id": studioresp["id"],
            "description": studioresp.get("description"),
            "name": studioresp["name"],
            "lang_code": studioresp.get("language"),
            "lang_name": channel_lang_name,
            "thumbnail": studioresp.get("icon_encoding"),
            "public": studioresp.get("public", True),
            "total_resources": studioresp.get("total_resource_count", 0),
            "total_file_size": studioresp.get("published_size"),
            "version": studioresp.get("version", 0),
            "included_languages": included_languages,
            "last_updated": studioresp.get("last_published"),
            "version_notes": studioresp.get("version_notes"),
        }

        return resp

    def list(self, request, *args, **kwargs):
        """
        Gets metadata about all public channels on kolibri studio.
        """
        baseurl = request.GET.get("baseurl", None)
        keyword = request.GET.get("keyword", None)
        language = request.GET.get("language", None)
        return self._make_channel_endpoint_request(
            baseurl=baseurl, keyword=keyword, language=language
        )

    def retrieve(self, request, pk=None):
        """
        Gets metadata about a channel through a token or channel id.
        """
        baseurl = request.GET.get("baseurl", None)
        keyword = request.GET.get("keyword", None)
        language = request.GET.get("language", None)
        return self._make_channel_endpoint_request(
            identifier=pk, baseurl=baseurl, keyword=keyword, language=language
        )

    @list_route(methods=["get"])
    def kolibri_studio_status(self, request, **kwargs):
        try:
            resp = requests.get(get_info_url())
            if resp.status_code == 404:
                raise requests.ConnectionError("Kolibri Studio URL is incorrect!")
            else:
                return Response({"status": "online"})
        except requests.ConnectionError:
            return Response({"status": "offline"})

    @detail_route(methods=["get"])
    def retrieve_list(self, request, pk=None):
        baseurl = request.GET.get("baseurl", None)
        keyword = request.GET.get("keyword", None)
        language = request.GET.get("language", None)
        return self._make_channel_endpoint_request(
            identifier=pk, baseurl=baseurl, keyword=keyword, language=language
        )
