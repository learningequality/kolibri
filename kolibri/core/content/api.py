import logging
import re
from functools import reduce
from random import sample

import requests
from django.core.cache import cache
from django.db.models import IntegerField
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

from kolibri.core.content import models
from kolibri.core.content import serializers
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.content_types_tools import renderable_contentnodes_q_filter
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_info_url
from kolibri.core.content.utils.stopwords import stopwords_set
from kolibri.core.decorators import query_params_required
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog

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
            request = kwargs.get('request', request)
        except IndexError:
            request = kwargs.get('request', None)
        if isinstance(request, HttpRequest):
            if any(map(lambda x: x in request.path, ['popular', 'next_steps', 'resume'])):
                timeout = 600
        patch_response_headers(response, cache_timeout=timeout)
        return response

    return wrapper_func


class ChannelMetadataFilter(FilterSet):
    available = BooleanFilter(method="filter_available")
    has_exercise = BooleanFilter(method="filter_has_exercise")

    class Meta:
        model = models.ChannelMetadata
        fields = ('available', 'has_exercise',)

    def filter_has_exercise(self, queryset, name, value):
        channel_ids = []

        for channel in queryset:
            channel_has_exercise = channel.root.get_descendants() \
                .filter(kind=content_kinds.EXERCISE, available=True) \
                .exists()
            if channel_has_exercise:
                channel_ids.append(channel.id)

        return queryset.filter(id__in=channel_ids)

    def filter_available(self, queryset, name, value):
        return queryset.filter(root__available=value)


@method_decorator(cache_forever, name='dispatch')
class ChannelMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ChannelMetadataSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ChannelMetadataFilter

    def get_queryset(self):
        return models.ChannelMetadata.objects.all().select_related('root__lang')


class IdFilter(FilterSet):
    ids = CharFilter(method="filter_ids")

    def filter_ids(self, queryset, name, value):
        try:
            # SQLITE_MAX_VARIABLE_NUMBER is 999 by default.
            # It means 999 is the max number of params for a query
            return queryset.filter(pk__in=value.split(',')[:900])
        except ValueError:
            # Catch in case of a poorly formed UUID
            return queryset.none()

    class Meta:
        fields = ['ids', ]


class ContentNodeFilter(IdFilter):
    recommendations_for = CharFilter(method="filter_recommendations_for")
    next_steps = CharFilter(method="filter_next_steps")
    popular = CharFilter(method="filter_popular")
    resume = CharFilter(method="filter_resume")
    kind = ChoiceFilter(method="filter_kind", choices=(content_kinds.choices + (('content', _('Content')),)))
    by_role = BooleanFilter(method="filter_by_role")
    in_lesson = CharFilter(method="filter_in_lesson")
    in_exam = CharFilter(method="filter_in_exam")
    exclude_content_ids = CharFilter(method="filter_exclude_content_ids")
    kind_in = CharFilter(method="filter_kind_in",)

    class Meta:
        model = models.ContentNode
        fields = ['parent', 'prerequisite_for', 'has_prerequisite', 'related', 'exclude_content_ids',
                  'recommendations_for', 'next_steps', 'popular', 'resume', 'ids', 'content_id', 'channel_id', 'kind', 'by_role', 'kind_in', ]

    def filter_kind(self, queryset, name, value):
        """
        Show only content of a given kind.

        :param queryset: all content nodes for this channel
        :param value: 'content' for everything except topics, or one of the content kind constants
        :return: content nodes of the given kind
        """
        if value == 'content':
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

    def filter_by_role(self, queryset, name, value):
        """
        Show coach_content if they have coach role or higher.

        :param queryset: all content nodes for this channel
        :param value: 'boolean'
        :return: content nodes filtered by coach_content if appropiate
        """
        user = self.request.user
        if user.is_facility_user:  # exclude anon users
            if user.roles.exists() or user.is_superuser:  # must have coach role or higher
                return queryset

        # In all other cases, exclude nodes that are coach content
        return queryset.exclude(coach_content=True)

    def filter_exclude_content_ids(self, queryset, name, value):
        return queryset.exclude(content_id__in=value.split(','))


class OptionalPageNumberPagination(pagination.PageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """
    page_size = None
    page_size_query_param = "page_size"


class SQSum(Subquery):
    # Include ALIAS at the end to support Postgres
    template = "(SELECT SUM(%(field)s) FROM (%(subquery)s) AS %(field)s__sum)"
    output_field = IntegerField()


@method_decorator(cache_forever, name='dispatch')
class ContentNodeViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ContentNodeSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    pagination_class = OptionalPageNumberPagination

    def prefetch_related(self, queryset):
        return queryset.prefetch_related(
            'assessmentmetadata',
            'files',
            'files__local_file'
        ).select_related('lang')

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
            'Expected view %s to be called with a URL keyword argument '
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            'attribute on the view correctly.' %
            (self.__class__.__name__, lookup_url_kwarg)
        )

        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj

    @list_route(methods=['get'])
    def descendants(self, request):
        """
        Returns a slim view all the descendants of a set of content nodes (as designated by the passed in ids).
        In addition to id, title, kind, and content_id, each node is also annotated with the ancestor_id of one
        of the ids that are passed into the request.
        In the case where a node has more than one ancestor in the set of content nodes requested, duplicates of
        that content node are returned, each annotated with one of the ancestor_ids for a node.
        """
        ids = self.request.query_params.get('ids', None)
        if not ids:
            return Response([])
        ids = ids.split(',')
        kind = self.request.query_params.get('descendant_kind', None)
        nodes = models.ContentNode.objects.filter(id__in=ids, available=True)
        data = []
        for node in nodes:
            def copy_node(new_node):
                new_node['ancestor_id'] = node.id
                return new_node
            node_data = node.get_descendants().filter(available=True)
            if kind:
                node_data = node_data.filter(kind=kind)
            data += map(copy_node, node_data.values('id', 'title', 'kind', 'content_id'))
        return Response(data)

    @list_route(methods=['get'])
    def descendants_assessments(self, request):
        ids = self.request.query_params.get('ids', None)
        if not ids:
            return Response([])
        ids = ids.split(',')
        queryset = models.ContentNode.objects.filter(id__in=ids, available=True)
        data = list(queryset.annotate(num_assessments=SQSum(models.ContentNode.objects.filter(
            tree_id=OuterRef('tree_id'),
            lft__gte=OuterRef('lft'),
            lft__lt=OuterRef('rght'),
            kind=content_kinds.EXERCISE,
            available=True,
        ).values_list('assessmentmetadata__number_of_assessments', flat=True), field='number_of_assessments')).values('id', 'num_assessments'))
        return Response(data)

    @list_route(methods=['get'])
    def node_assessments(self, request):
        ids = self.request.query_params.get('ids', '').split(',')
        data = 0
        if ids and ids[0]:
            nodes = models.ContentNode.objects.filter(id__in=ids, available=True).prefetch_related('assessmentmetadata')
            data = nodes.aggregate(Sum('assessmentmetadata__number_of_assessments'))['assessmentmetadata__number_of_assessments__sum'] or 0
        return Response(data)

    @detail_route(methods=['get'])
    def copies(self, request, pk=None):
        """
        Returns each nodes that has this content id, along with their ancestors.
        """
        # let it be noted that pk is actually the content id in this case
        cache_key = 'contentnode_copies_ancestors_{content_id}'.format(content_id=pk)

        if cache.get(cache_key) is not None:
            return Response(cache.get(cache_key))

        copies = []
        nodes = models.ContentNode.objects.filter(content_id=pk, available=True)
        for node in nodes:
            copies.append(node.get_ancestors(include_self=True).values('id', 'title'))

        cache.set(cache_key, copies, 60 * 10)
        return Response(copies)

    @list_route(methods=['get'])
    def copies_count(self, request, **kwargs):
        """
        Returns the number of node copies for each content id.
        """
        content_id_string = self.request.query_params.get('content_ids')
        if content_id_string:
            content_ids = content_id_string.split(',')
            counts = models.ContentNode.objects.filter(content_id__in=content_ids, available=True) \
                                               .values('content_id') \
                                               .order_by() \
                                               .annotate(count=Count('content_id'))
        else:
            counts = 0
        return Response(counts)

    @detail_route(methods=['get'])
    def next_content(self, request, **kwargs):
        # retrieve the "next" content node, according to depth-first tree traversal
        this_item = self.get_object()
        next_item = models.ContentNode.objects.filter(available=True, tree_id=this_item.tree_id, lft__gt=this_item.rght).order_by("lft").first()
        if not next_item:
            next_item = this_item.get_root()

        thumbnails = serializers.FileSerializer(next_item.files.filter(thumbnail=True), many=True).data
        if thumbnails:
            return Response({'kind': next_item.kind, 'id': next_item.id, 'title': next_item.title, 'thumbnail': thumbnails[0]['storage_url']})
        return Response({'kind': next_item.kind, 'id': next_item.id, 'title': next_item.title})


@method_decorator(cache_forever, name='dispatch')
class ContentNodeSlimViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ContentNodeSlimSerializer
    filter_backends = (DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    pagination_class = OptionalPageNumberPagination

    def prefetch_related(self, queryset):
        return queryset.prefetch_related('files__local_file')

    def get_queryset(self, prefetch=True):
        queryset = models.ContentNode.objects.filter(available=True)
        if prefetch:
            return self.prefetch_related(queryset)
        return queryset

    def get_object(self, prefetch=True):
        """
        Returns the object the view is displaying.
        You may want to override this if you need to provide non-standard
        queryset lookups. Eg if objects are referenced using multiple
        keyword arguments in the url conf.
        """
        queryset = self.filter_queryset(self.get_queryset(prefetch=prefetch))

        # Perform the lookup filtering.
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field

        assert lookup_url_kwarg in self.kwargs, (
            'Expected view %s to be called with a URL keyword argument '
            'named "%s". Fix your URL conf, or set the `.lookup_field` '
            'attribute on the view correctly.' %
            (self.__class__.__name__, lookup_url_kwarg)
        )

        filter_kwargs = {self.lookup_field: self.kwargs[lookup_url_kwarg]}
        obj = get_object_or_404(queryset, **filter_kwargs)

        # May raise a permission denied
        self.check_object_permissions(self.request, obj)

        return obj

    @detail_route(methods=['get'])
    def ancestors(self, request, **kwargs):
        cache_key = 'contentnode_slim_ancestors_{pk}'.format(pk=kwargs.get('pk'))

        if cache.get(cache_key) is not None:
            return Response(cache.get(cache_key))

        ancestors = list(self.get_object(prefetch=False).get_ancestors().values('id', 'title'))

        cache.set(cache_key, ancestors, 60 * 10)

        return Response(ancestors)

    @detail_route(methods=['get'])
    def recommendations_for(self, request, **kwargs):
        """
        Recommend items that are similar to this piece of content.
        """
        # Only using this to get a node reference, not being returned, so don't prefetch.
        queryset = self.filter_queryset(self.get_queryset(prefetch=False))
        pk = kwargs.get('pk', None)
        node = get_object_or_404(queryset, pk=pk)
        queryset = self.filter_queryset(self.get_queryset(prefetch=False))
        queryset = self.prefetch_related(queryset & node.get_siblings(include_self=False).exclude(kind=content_kinds.TOPIC))
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @detail_route(methods=['get'])
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
        user_id = kwargs.get('pk', None)
        queryset = self.get_queryset(prefetch=True)
        # if user is anonymous, don't return any nodes
        # if person requesting is not the data they are requesting for, also return no nodes
        if not user.is_facility_user or user.id != user_id:
            queryset = queryset.none()
        else:
            completed_content_ids = ContentSummaryLog.objects.filter(
                user=user, progress=1).values_list('content_id', flat=True)

            # If no logs, don't bother doing the other queries
            if not completed_content_ids:
                queryset = queryset.none()
            else:
                completed_content_nodes = queryset.filter(content_id__in=completed_content_ids).order_by()

                # Filter to only show content that the user has not engaged in, so as not to be redundant with resume
                queryset = queryset.exclude(content_id__in=ContentSummaryLog.objects.filter(user=user).values_list('content_id', flat=True)).filter(
                    Q(has_prerequisite__in=completed_content_nodes)
                    | Q(lft__in=[rght + 1 for rght in completed_content_nodes.values_list('rght', flat=True)])
                ).order_by()
                if not (user.roles.exists() or user.is_superuser):  # must have coach role or higher
                    queryset = queryset.exclude(coach_content=True)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @list_route(methods=['get'])
    def popular(self, request, **kwargs):
        """
        Recommend content that is popular with all users.

        :param request: request object
        :return: 10 most popular content nodes
        """
        cache_key = 'popular_content'
        coach_content = False

        user = request.user
        if user.is_facility_user:  # exclude anon users
            if user.roles.exists() or user.is_superuser:  # must have coach role or higher
                cache_key = 'popular_content_coach'
                coach_content = True

        queryset = self.get_queryset(prefetch=True)

        if not cache.get(cache_key):
            if ContentSessionLog.objects.count() < 50:
                # return 25 random content nodes if not enough session logs
                pks = queryset.values_list('pk', flat=True).exclude(kind=content_kinds.TOPIC)
                # .count scales with table size, so can get slow on larger channels
                count_cache_key = 'content_count_for_popular'
                count = cache.get(count_cache_key) or min(pks.count(), 25)
                queryset = queryset.filter(pk__in=sample(list(pks), count))
                if not coach_content:
                    queryset = queryset.exclude(coach_content=True)
            else:
                # get the most accessed content nodes
                # search for content nodes that currently exist in the database
                content_nodes = models.ContentNode.objects.filter(available=True)
                if not coach_content:
                    content_nodes = content_nodes.exclude(coach_content=True)
                content_counts_sorted = ContentSessionLog.objects \
                    .filter(content_id__in=content_nodes.values_list('content_id', flat=True).distinct()) \
                    .values_list('content_id', flat=True) \
                    .annotate(Count('content_id')) \
                    .order_by('-content_id__count')

                most_popular = queryset.filter(content_id__in=list(content_counts_sorted[:20]))
                queryset = most_popular.dedupe_by_content_id()

            serializer = self.get_serializer(queryset, many=True)

            # cache the popular results queryset for 10 minutes, for efficiency
            cache.set(cache_key, serializer.data, 60 * 10)

        return Response(cache.get(cache_key))

    @detail_route(methods=['get'])
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
        user_id = kwargs.get('pk', None)
        queryset = self.get_queryset(prefetch=True)
        # if user is anonymous, don't return any nodes
        # if person requesting is not the data they are requesting for, also return no nodes
        if not user.is_facility_user or user.id != user_id:
            queryset = queryset.none()
        else:
            # get the most recently viewed, but not finished, content nodes
            # search for content nodes that currently exist in the database
            content_ids = ContentSummaryLog.objects \
                .filter(content_id__in=models.ContentNode.objects.values_list('content_id', flat=True).distinct()) \
                .filter(user=user) \
                .exclude(progress=1) \
                .order_by('end_timestamp') \
                .values_list('content_id', flat=True) \
                .distinct()

            # If no logs, don't bother doing the other queries
            if not content_ids:
                queryset = queryset.none()
            else:
                resume = queryset.filter(content_id__in=list(content_ids[:10]))
                queryset = resume.dedupe_by_content_id()

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


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

    def list(self, request, **kwargs):
        """
        Implement various filtering strategies in order to get a wide range of search results.
        """

        value = self.kwargs['search']
        MAX_RESULTS = self.kwargs['max_results']

        queryset = self.filter_queryset(self.get_queryset())

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
        BUFFER_SIZE = MAX_RESULTS * 2  # grab some extras, but not too many

        # iterate over each query type, and build up search results
        for query in all_queries:

            # in each pass, don't take any items already in the result set
            matches = queryset.exclude(content_id__in=list(content_ids)).filter(query)[:BUFFER_SIZE]

            for match in matches:
                # filter the dupes
                if match.content_id in content_ids:
                    continue
                # add new, unique results
                content_ids.add(match.content_id)
                results.append(match)

                # bail out as soon as we reach the quota
                if len(results) >= MAX_RESULTS:
                    break
            # bail out as soon as we reach the quota
            if len(results) >= MAX_RESULTS:
                break

        # If no queries, just use an empty Q.
        all_queries_filter = union(all_queries) or Q()

        total_results = queryset.filter(all_queries_filter).values_list('content_id', flat=True).distinct().count()

        # Use unfiltered queryset to collect channel_ids and kinds metadata.
        unfiltered_queryset = self.get_queryset()

        channel_ids = unfiltered_queryset.filter(all_queries_filter).values_list('channel_id', flat=True).order_by('channel_id').distinct()

        content_kinds = unfiltered_queryset.filter(all_queries_filter).values_list('kind', flat=True).order_by('kind').distinct()

        serializer = self.get_serializer(results, many=True)
        return Response({
            'channel_ids': channel_ids,
            'content_kinds': content_kinds,
            'results': serializer.data,
            'total_results': total_results,
        })


class ContentNodeGranularViewset(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = serializers.ContentNodeGranularSerializer

    def get_queryset(self):
        return models.ContentNode.objects.all().prefetch_related('files__local_file').filter(renderable_contentnodes_q_filter).distinct()

    def retrieve(self, request, pk):
        queryset = self.get_queryset()
        instance = get_object_or_404(queryset, pk=pk)
        children = queryset.filter(parent=instance)

        parent_serializer = self.get_serializer(instance)
        parent_data = parent_serializer.data
        child_serializer = self.get_serializer(children, many=True)
        parent_data['children'] = child_serializer.data

        return Response(parent_data)


class ContentNodeProgressFilter(IdFilter):
    class Meta:
        model = models.ContentNode
        fields = ['ids', ]


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

    http_method_names = ['get']

    def _make_channel_endpoint_request(self, identifier=None, baseurl=None, keyword=None, language=None):

        url = get_channel_lookup_url(identifier=identifier, baseurl=baseurl, keyword=keyword, language=language)

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
            logger.warning("Did not find language code {} in our le_utils.constants!".format(code))
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
        }

        return resp

    def list(self, request, *args, **kwargs):
        """
        Gets metadata about all public channels on kolibri studio.
        """
        baseurl = request.GET.get("baseurl", None)
        keyword = request.GET.get("keyword", None)
        language = request.GET.get("language", None)
        return self._make_channel_endpoint_request(baseurl=baseurl, keyword=keyword, language=language)

    def retrieve(self, request, pk=None):
        """
        Gets metadata about a channel through a token or channel id.
        """
        baseurl = request.GET.get("baseurl", None)
        keyword = request.GET.get("keyword", None)
        language = request.GET.get("language", None)
        return self._make_channel_endpoint_request(identifier=pk, baseurl=baseurl, keyword=keyword, language=language)

    @list_route(methods=['get'])
    def kolibri_studio_status(self, request, **kwargs):
        try:
            resp = requests.get(get_info_url())
            if resp.status_code == 404:
                raise requests.ConnectionError("Kolibri Studio URL is incorrect!")
            else:
                return Response({"status": "online"})
        except requests.ConnectionError:
            return Response({"status": "offline"})

    @detail_route(methods=['get'])
    def retrieve_list(self, request, pk=None):
        baseurl = request.GET.get("baseurl", None)
        keyword = request.GET.get("keyword", None)
        language = request.GET.get("language", None)
        return self._make_channel_endpoint_request(identifier=pk, baseurl=baseurl, keyword=keyword, language=language)


class ContentNodeFileSizeViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ContentNodeGranularSerializer

    def get_queryset(self):
        return models.ContentNode.objects.all()

    def retrieve(self, request, pk):
        instance = self.get_object()
        files = models.LocalFile.objects.filter(files__contentnode__in=instance.get_descendants(include_self=True)).distinct()
        total_file_size = files.aggregate(Sum('file_size'))['file_size__sum'] or 0
        on_device_file_size = files.filter(available=True).aggregate(Sum('file_size'))['file_size__sum'] or 0

        return Response({'total_file_size': total_file_size, 'on_device_file_size': on_device_file_size})
