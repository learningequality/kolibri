# -*- coding: utf-8 -*-
"""
Most of the api endpoints here use django_rest_framework to expose the content app APIs,
except some set methods that do not return anything.
"""

from django.conf import settings
from django.conf.urls import include, url
from django.db.models import Q
from kolibri.content import api, models, serializers
from rest_framework import filters, pagination, routers, viewsets
from rest_framework.decorators import detail_route
from rest_framework.response import Response


class ChannelMetadataCacheViewSet(viewsets.ModelViewSet):
    serializer_class = serializers.ChannelMetadataCacheSerializer

    def get_queryset(self):
        return models.ChannelMetadataCache.objects.all()


class ContentNodeFilter(filters.FilterSet):
    search = filters.django_filters.MethodFilter(action='title_description_filter')

    class Meta:
        model = models.ContentNode
        fields = ['parent', 'search']

    def title_description_filter(self, queryset, value):
        # only return the first 30 results to avoid major slow down
        return queryset.filter(
            Q(title__icontains=value) | Q(description__icontains=value)
        )


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

    @detail_route()
    def ancestor_topics(self, request, *args, **kwargs):
        """
        endpoint for content api method
        get_ancestor_topics(content=None, **kwargs)
        """
        data = serializers.ContentNodeSerializer(
            api.get_ancestor_topics(content=self.kwargs['pk']), many=True, context={"request": request}
        ).data
        return Response(data)

    @detail_route()
    def immediate_children(self, request, *args, **kwargs):
        """
        endpoint for content api method
        immediate_children(content=None, **kwargs)
        """
        data = serializers.ContentNodeSerializer(
            api.immediate_children(content=self.kwargs['pk']), many=True, context={"request": request}
        ).data
        return Response(data)

    @detail_route()
    def leaves(self, request, *args, **kwargs):
        """
        endpoint for content api method
        leaves(content=None, **kwargs)
        """
        data = serializers.ContentNodeSerializer(
            api.leaves(content=self.kwargs['pk']), many=True, context={"request": request}
        ).data
        return Response(data)

    @detail_route()
    def all_prerequisites(self, request, *args, **kwargs):
        """
        endpoint for content api method
        get_all_prerequisites(content=None, **kwargs)
        """
        data = serializers.ContentNodeSerializer(
            api.get_all_prerequisites(content=self.kwargs['pk']), many=True, context={"request": request}
        ).data
        return Response(data)

    @detail_route()
    def all_related(self, request, *args, **kwargs):
        """
        endpoint for content api method
        get_all_related(content=None, **kwargs)
        """
        data = serializers.ContentNodeSerializer(
            api.get_all_related(content=self.kwargs['pk']), many=True, context={"request": request}
        ).data
        return Response(data)

    @detail_route()
    def missing_files(self, request, *args, **kwargs):
        """
        endpoint for content api method
        get_missing_files(content=None, **kwargs)
        """
        data = serializers.FileSerializer(
            api.get_missing_files(content=self.kwargs['pk']), many=True, context={"request": request}
        ).data
        return Response(data)


class FileViewset(viewsets.ModelViewSet):
    serializer_class = serializers.FileSerializer
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        return models.File.objects.all()


router = routers.SimpleRouter()
router.register('content', ChannelMetadataCacheViewSet, base_name="channel")

content_router = routers.SimpleRouter()
content_router.register(r'contentnode', ContentNodeViewset, base_name='contentnode')
content_router.register(r'file', FileViewset, base_name='file')

urlpatterns = [
    url(r'^' + settings.STORAGE_URL[1:-1] + '(?P<path>.*)$', 'django.views.static.serve', {
        'document_root': settings.STORAGE_ROOT}),
    url(r'^api/', include(router.urls)),
    url(r'^api/content/(?P<channel_id>[^/.]+)/', include(content_router.urls)),
]
