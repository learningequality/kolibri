from functools import reduce
from random import sample

from django.db.models import Q
from django.db.models.aggregates import Count
from kolibri.content import models, serializers
from rest_framework import filters, pagination, viewsets
from .utils.search import fuzz


class ChannelMetadataCacheViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ChannelMetadataCacheSerializer

    def get_queryset(self):
        return models.ChannelMetadataCache.objects.all()


class ContentNodeFilter(filters.FilterSet):
    search = filters.django_filters.MethodFilter(action='title_description_filter')
    recommendations_for = filters.django_filters.MethodFilter()
    recommendations = filters.django_filters.MethodFilter()

    class Meta:
        model = models.ContentNode
        fields = ['parent', 'search', 'prerequisite_for', 'has_prerequisite', 'related', 'recommendations_for', 'recommendations']

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
        recc_node = queryset.get(pk=value)
        descendants = recc_node.get_descendants(include_self=False).exclude(kind__in=['topic', ''])
        siblings = recc_node.get_siblings(include_self=False).exclude(kind__in=['topic', ''])
        data = descendants | siblings  # concatenates different querysets
        return data

    def filter_recommendations(self, queryset, value):

        from kolibri.logger.models import ContentSessionLog

        if ContentSessionLog.objects.count() < 50:
            # return 25 random content nodes if not enough session logs
            pks = queryset.values_list('pk', flat=True).exclude(kind__in=['topic', ''])
            count = min(pks.count(), 25)
            return queryset.filter(pk__in=sample(list(pks), count))

        # if user is anonymous, only give them the most popular content nodes
        if value is None:
            recently_viewed = queryset.objects.none()
        else:
            if self.data['channel']:  # filter by channel if available
                user_session_logs = ContentSessionLog.objects.filter(user=value, channel_id=self.data['channel'])
            else:
                user_session_logs = ContentSessionLog.objects.filter(user=value)

            # get the most recently viewed, but not finished, content nodes
            content_ids = user_session_logs.exclude(progress=1).order_by('end_timestamp').values_list('content_id', flat=True).distinct()
            recently_viewed = queryset.filter(content_id__in=list(content_ids[:10]))

        # get the most popular logs for this channel
        if self.data['channel']:  # filter by channel if available
            session_logs = ContentSessionLog.objects.filter(channel_id=self.data['channel'])
        else:
            session_logs = ContentSessionLog.objects.all()

        # get the most accessed content nodes
        content_counts_sorted = session_logs.values_list('content_id', flat=True).annotate(Count('content_id')).order_by('-content_id__count')
        most_popular = queryset.filter(content_id__in=list(content_counts_sorted[:10]))

        return recently_viewed | most_popular


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
