from django.db.models import Q
from kolibri.content import models, serializers
from rest_framework import filters, pagination, viewsets
from .recommendations import recommendations_content_node
from rest_framework.decorators import detail_route
from rest_framework.response import Response

from kolibri.logger.models import ContentInteractionLog
from django.db.models.aggregates import Count


class ChannelMetadataCacheViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ChannelMetadataCacheSerializer

    def get_queryset(self):
        return models.ChannelMetadataCache.objects.all()


class ContentNodeFilter(filters.FilterSet):
    search = filters.django_filters.MethodFilter(action='title_description_filter')
    recommendations_for = filters.django_filters.MethodFilter()
    reccomendations = filters.django_filters.MethodFilter()

    class Meta:
        model = models.ContentNode
        fields = ['parent', 'search', 'prerequisite_for', 'has_prerequisite', 'related', 'recommendations_for', 'reccomendations']

    def title_description_filter(self, queryset, value):
        # only return the first 30 results to avoid major slow down
        return queryset.filter(
            Q(title__icontains=value) | Q(description__icontains=value)
        )

    def filter_recommendations_for(self, queryset, value):
        recc_node = queryset.get(pk=value)
        children = recc_node.get_children()
        descendants = recc_node.get_descendants(include_self=False)
        siblings = recc_node.get_siblings(include_self=False)
        data = children | descendants | siblings  # concatenates different querysets
        return data

    def filter_recommendations(self, queryset, value):
        if ContentInteractionLog.objects.count() == 0:
            return queryset[:10]

        content_counts_sorted = ContentInteractionLog.objects.values('content_id').annotate(Count('content_id')).order_by('-content_id__count')
        return queryset.filter(
            content_id__in=[content['content_id'] for content in content_counts_sorted][:10])  # return the 10 most frequently accessed pieces of content


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

    # @detail_route()
    # def recommendations(self, request, *args, **kwargs):
    #     reccs = recommendations_content_node(pk=self.kwargs['pk'])
    #     data = serializers.ContentNodeSerializer(reccs, many=True).data
    #     return Response(data)

class FileViewset(viewsets.ModelViewSet):
    serializer_class = serializers.FileSerializer
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        return models.File.objects.all()
