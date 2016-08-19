from random import sample

from django.db.models import Q
from kolibri.content import models, serializers
from rest_framework import filters, pagination, viewsets
from utils.metaphone import dm
from utils.stemmer import stem


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
        return queryset.filter(
            Q(parent__isnull=False),
            reduce(lambda x, y: x & y, [Q(stemmed_metaphone__icontains=dm(stem(word))[0]) for word in value.split()]))

    def filter_recommendations_for(self, queryset, value):
        recc_node = queryset.get(pk=value)
        descendants = recc_node.get_descendants(include_self=False).exclude(kind__in=['topic', ''])
        siblings = recc_node.get_siblings(include_self=False).exclude(kind__in=['topic', ''])
        data = descendants | siblings  # concatenates different querysets
        return data

    def filter_recommendations(self, queryset, value):
        # return 25 random content nodes
        pks = queryset.values_list('pk', flat=True).exclude(kind__in=['topic', ''])
        count = min(pks.count(), 25)
        return queryset.filter(pk__in=sample(list(pks), count))


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
