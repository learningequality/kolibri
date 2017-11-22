from functools import reduce
from random import sample

from django.core.cache import cache
from django.db.models import Q
from django.db.models.aggregates import Count
from kolibri.content import models, serializers
from kolibri.logger.models import ContentSessionLog, ContentSummaryLog
from le_utils.constants import content_kinds
from rest_framework import filters, pagination, viewsets
from rest_framework.decorators import detail_route, list_route
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from .utils.search import fuzz


class ChannelMetadataFilter(filters.FilterSet):
    available = filters.django_filters.MethodFilter()

    def filter_available(self, queryset, value):
        return queryset.filter(root__available=value)

    class Meta:
        model = models.ChannelMetadata
        fields = ['available', ]


class ChannelMetadataViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ChannelMetadataSerializer
    filter_backends = (filters.DjangoFilterBackend,)
    filter_class = ChannelMetadataFilter

    def get_queryset(self):
        return models.ChannelMetadata.objects.all().order_by('-last_updated')


class IdFilter(filters.FilterSet):
    ids = filters.django_filters.MethodFilter()

    def filter_ids(self, queryset, value):
        return queryset.filter(pk__in=value.split(','))

    class Meta:
        fields = ['ids', ]


class ContentNodeFilter(IdFilter):
    search = filters.django_filters.MethodFilter(action='title_description_filter')
    recommendations_for = filters.django_filters.MethodFilter()
    next_steps = filters.django_filters.MethodFilter()
    popular = filters.django_filters.MethodFilter()
    resume = filters.django_filters.MethodFilter()
    kind = filters.django_filters.MethodFilter()

    class Meta:
        model = models.ContentNode
        fields = ['parent', 'search', 'prerequisite_for', 'has_prerequisite', 'related',
                  'recommendations_for', 'next_steps', 'popular', 'resume', 'ids', 'content_id', 'channel_id', 'kind']

    def title_description_filter(self, queryset, value):
        """
        search for title or description that contains the keywords that are not necessary in adjacent
        """
        exact_match = queryset.filter(Q(parent__isnull=False), Q(title__icontains=value) | Q(description__icontains=value))
        if exact_match:
            return exact_match
        # if no exact match, fuzzy search using the stemmed_metaphone field in ContentNode that covers the title and description
        fuzzed_tokens = [fuzz(word) for word in value.split()]
        if not fuzzed_tokens[0]:
            return []
        token_queries = [reduce(lambda x, y: x | y, [Q(stemmed_metaphone__contains=token) for token in tokens]) for tokens in fuzzed_tokens]
        return queryset.filter(
            Q(parent__isnull=False),
            reduce(lambda x, y: x & y, token_queries))

    def filter_recommendations_for(self, queryset, value):
        """
        Recommend items that are similar to this piece of content.
        """
        return queryset.get(pk=value).get_siblings(
            include_self=False).order_by("lft").exclude(kind=content_kinds.TOPIC)

    def filter_next_steps(self, queryset, value):
        """
        Recommend content that has user completed content as a prerequisite, or leftward sibling.

        :param queryset: all content nodes for this channel
        :param value: id of currently logged in user, or none if user is anonymous
        :return: uncompleted content nodes, or empty queryset if user is anonymous
        """

        # if user is anonymous, don't return any nodes
        if not value:
            return queryset.none()

        completed_content_ids = ContentSummaryLog.objects.filter(
            user=value, progress=1).values_list('content_id', flat=True)

        # If no logs, don't bother doing the other queries
        if not completed_content_ids:
            return queryset.none()

        completed_content_nodes = queryset.filter(content_id__in=completed_content_ids).order_by()

        # Filter to only show content that the user has not engaged in, so as not to be redundant with resume
        return queryset.exclude(content_id__in=ContentSummaryLog.objects.filter(
            user=value).values_list('content_id', flat=True)).filter(
            Q(has_prerequisite__in=completed_content_nodes) |
            Q(lft__in=[rght + 1 for rght in completed_content_nodes.values_list('rght', flat=True)])
        ).order_by()

    def filter_popular(self, queryset, value):
        """
        Recommend content that is popular with all users.

        :param queryset: all content nodes for this channel
        :param value: id of currently logged in user, or none if user is anonymous
        :return: 10 most popular content nodes
        """
        if ContentSessionLog.objects.count() < 50:
            # return 25 random content nodes if not enough session logs
            pks = queryset.values_list('pk', flat=True).exclude(kind=content_kinds.TOPIC)
            # .count scales with table size, so can get slow on larger channels
            count_cache_key = 'content_count_for_popular'
            count = cache.get(count_cache_key) or min(pks.count(), 25)
            return queryset.filter(pk__in=sample(list(pks), count))

        cache_key = 'popular_content'
        if cache.get(cache_key):
            return cache.get(cache_key)

        # get the most accessed content nodes
        content_counts_sorted = ContentSessionLog.objects \
            .values_list('content_id', flat=True) \
            .annotate(Count('content_id')) \
            .order_by('-content_id__count')

        most_popular = queryset.filter(content_id__in=list(content_counts_sorted[:10]))

        # cache the popular results queryset for 10 minutes, for efficiency
        cache.set(cache_key, most_popular, 60 * 10)
        return most_popular

    def filter_resume(self, queryset, value):
        """
        Recommend content that the user has recently engaged with, but not finished.

        :param queryset: all content nodes for this channel
        :param value: id of currently logged in user, or none if user is anonymous
        :return: 10 most recently viewed content nodes
        """

        # if user is anonymous, return no nodes
        if not value:
            return queryset.none()

        # get the most recently viewed, but not finished, content nodes
        content_ids = ContentSummaryLog.objects \
            .filter(user=value) \
            .exclude(progress=1) \
            .order_by('end_timestamp') \
            .values_list('content_id', flat=True) \
            .distinct()

        # If no logs, don't bother doing the other queries
        if not content_ids:
            return queryset.none()

        resume = queryset.filter(content_id__in=list(content_ids[:10]))

        return resume

    def filter_kind(self, queryset, value):
        """
        Show only content of a given kind.

        :param queryset: all content nodes for this channel
        :param value: 'content' for everything except topics, or one of the content kind constants
        :return: content nodes of the given kind
        """
        if value == 'content':
            return queryset.exclude(kind=content_kinds.TOPIC).order_by("lft")
        return queryset.filter(kind=value).order_by("lft")


class OptionalPageNumberPagination(pagination.PageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """
    page_size = None
    page_size_query_param = "page_size"


class ContentNodeViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ContentNodeSerializer
    filter_backends = (filters.DjangoFilterBackend,)
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

    @detail_route(methods=['get'])
    def descendants(self, request, **kwargs):
        node = self.get_object(prefetch=False)
        kind = self.request.query_params.get('descendant_kind', None)
        descendants = node.get_descendants()
        if kind:
            descendants = descendants.filter(kind=kind)

        serializer = self.get_serializer(descendants, many=True)
        return Response(serializer.data)

    @detail_route(methods=['get'])
    def ancestors(self, request, **kwargs):
        cache_key = 'contentnode_ancestors_{pk}'.format(pk=kwargs.get('pk'))

        if cache.get(cache_key) is not None:
            return Response(cache.get(cache_key))

        ancestors = list(self.get_object(prefetch=False).get_ancestors().values('pk', 'title'))

        cache.set(cache_key, ancestors, 60 * 10)

        return Response(ancestors)

    @detail_route(methods=['get'])
    def next_content(self, request, **kwargs):
        # retrieve the "next" content node, according to depth-first tree traversal
        this_item = self.get_object()
        next_item = models.ContentNode.objects.filter(tree_id=this_item.tree_id, lft__gt=this_item.rght).order_by("lft").first()
        if not next_item:
            next_item = this_item.get_root()
        return Response({'kind': next_item.kind, 'id': next_item.id, 'title': next_item.title})

    @list_route(methods=['get'])
    def all_content(self, request, **kwargs):
        queryset = self.filter_queryset(self.get_queryset(prefetch=False)).exclude(kind=content_kinds.TOPIC)

        serializer = self.get_serializer(queryset, many=True, limit=24)
        return Response(serializer.data)


class ContentNodeProgressFilter(IdFilter):
    class Meta:
        model = models.ContentNode


class ContentNodeProgressViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.ContentNodeProgressSerializer
    filter_backends = (filters.DjangoFilterBackend,)
    filter_class = ContentNodeProgressFilter

    def get_queryset(self):
        return models.ContentNode.objects.all()


class FileViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.FileSerializer
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        return models.File.objects.all()
