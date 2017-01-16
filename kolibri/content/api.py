from functools import reduce
from random import sample

from django.core.cache import cache
from django.db.models import Q
from django.db.models.aggregates import Count
from kolibri.content import models, serializers
from kolibri.content.content_db_router import get_active_content_database
from kolibri.logger.models import ContentSessionLog, ContentSummaryLog
from le_utils.constants import content_kinds
from rest_framework import filters, pagination, viewsets

from .utils.search import fuzz

def _join_with_logical_operator(lst, operator):
    op = ") {operator} (".format(operator=operator)
    return "(({items}))".format(items=op.join(lst))

class ChannelMetadataCacheViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ChannelMetadataCacheSerializer

    def get_queryset(self):
        return models.ChannelMetadataCache.objects.all()


class ContentNodeFilter(filters.FilterSet):
    search = filters.django_filters.MethodFilter(action='title_description_filter')
    recommendations_for = filters.django_filters.MethodFilter()
    next_steps = filters.django_filters.MethodFilter()
    popular = filters.django_filters.MethodFilter()
    resume = filters.django_filters.MethodFilter()
    kind = filters.django_filters.MethodFilter()

    class Meta:
        model = models.ContentNode
        fields = ['parent', 'search', 'prerequisite_for', 'has_prerequisite', 'related', 'recommendations_for']

    def title_description_filter(self, queryset, value):
        """
        search for title or description that contains the keywords that are not necessary in adjacent
        """
        exact_match = queryset.filter(Q(parent__isnull=False), Q(title__icontains=value) | Q(description__icontains=value))
        if exact_match:
            return exact_match
        # if no exact match, fuzzy search using the stemmed_metaphone field in ContentNode that covers the title and description
        fuzzed_tokens = [fuzz(word) for word in value.split()]
        token_queries = [reduce(lambda x, y: x | y, [Q(stemmed_metaphone__contains=token) for token in tokens]) for tokens in fuzzed_tokens]
        return queryset.filter(
            Q(parent__isnull=False),
            reduce(lambda x, y: x & y, token_queries))

    def filter_recommendations_for(self, queryset, value):
        """
        Recommend items that are similar to this piece of content.
        """
        recc_node = queryset.get(pk=value)
        descendants = recc_node.get_descendants(include_self=False).exclude(kind__in=['topic', ''])
        siblings = recc_node.get_siblings(include_self=False).exclude(kind__in=['topic', ''])
        data = descendants | siblings  # concatenates different querysets
        return data

    def filter_next_steps(self, queryset, value):
        """
        Recommend uncompleted content, content that has user completed content as a prerequisite.

        :param queryset: all content nodes for this channel
        :param value: id of currently logged in user, or none if user is anonymous
        :return: uncompleted content nodes, or empty queryset if user is anonymous
        """

        # if user is anonymous, don't return any nodes
        if not value:
            return queryset.none()

        tables = [
            '"{summarylog_table}" AS "complete_log"',
            '"{summarylog_table}" AS "incomplete_log"',
            '"{content_table}" AS "complete_node"',
            '"{content_table}" AS "incomplete_node"',
        ]
        table_names = {
            "summarylog_table": ContentSummaryLog._meta.db_table,
            "content_table": models.ContentNode._meta.db_table,
        }
        # aliases for sql table names
        sql_tables_and_aliases = [table.format(**table_names) for table in tables]
        # where conditions joined by ANDs
        where_statements = ["NOT (incomplete_log.progress < 1 AND incomplete_log.content_id = incomplete_node.content_id)",
                            "complete_log.user_id = {user_id}".format(user_id=value),
                            "incomplete_log.user_id = {user_id}".format(user_id=value),
                            "complete_log.progress = 1",
                            "complete_node.rght = incomplete_node.lft - 1",
                            "complete_log.content_id = complete_node.content_id"]
        # custom SQL query to get uncompleted content based on mptt algorithm
        next_steps_recommendations = "SELECT incomplete_node.* FROM {tables} WHERE {where}".format(
            tables=", ".join(sql_tables_and_aliases),
            where=_join_with_logical_operator(where_statements, "AND")
        )
        return models.ContentNode.objects.raw(next_steps_recommendations)

    def filter_popular(self, queryset, value):
        """
        Recommend content that is popular with all users.

        :param queryset: all content nodes for this channel
        :param value: id of currently logged in user, or none if user is anonymous
        :return: 10 most popular content nodes
        """
        if ContentSessionLog.objects.count() < 50:
            # return 25 random content nodes if not enough session logs
            pks = queryset.values_list('pk', flat=True).exclude(kind__in=['topic', ''])
            count = min(pks.count(), 25)
            return queryset.filter(pk__in=sample(list(pks), count))

        cache_key = 'popular_for_{}'.format(get_active_content_database())
        if cache.get(cache_key):
            return cache.get(cache_key)

        # get the most accessed content nodes
        content_counts_sorted = ContentSessionLog.objects \
            .filter(channel_id=get_active_content_database()) \
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
            .filter(user=value, channel_id=get_active_content_database()) \
            .exclude(progress=1) \
            .order_by('end_timestamp') \
            .values_list('content_id', flat=True) \
            .distinct()

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


class ContentNodeViewset(viewsets.ModelViewSet):
    serializer_class = serializers.ContentNodeSerializer
    filter_backends = (filters.DjangoFilterBackend,)
    filter_class = ContentNodeFilter
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        return models.ContentNode.objects.all()


class FileViewset(viewsets.ModelViewSet):
    serializer_class = serializers.FileSerializer
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        return models.File.objects.all()
