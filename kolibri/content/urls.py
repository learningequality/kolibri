# -*- coding: utf-8 -*-
"""
Most of the api endpoints here use django_rest_framework to expose the content app APIs,
except some set methods that do not return anything.
"""
import ast

from django.conf.urls import include, url
from django.db.models import Q
from kolibri.content import api, models, serializers
from kolibri.content.content_db_router import using_content_database
from rest_framework import filters, viewsets
from rest_framework.decorators import detail_route
from rest_framework.response import Response
from rest_framework_nested import routers


class ChannelMetadataViewSet(viewsets.ViewSet):
    lookup_field = 'channel_id'

    def list(self, request, channel_pk=None):
        with using_content_database("default"):
            channels = serializers.ChannelMetadataSerializer(models.ChannelMetadata.objects.all(),
                                                             context={'request': request}, many=True).data
            return Response(channels)

    def retrieve(self, request, pk=None, channel_id=None):
        with using_content_database("default"):
            channel = serializers.ChannelMetadataSerializer(models.ChannelMetadata.objects.get(channel_id=channel_id),
                                                            context={'request': request}).data
            return Response(channel)


class ContentNodeFilter(filters.FilterSet):
    search = filters.django_filters.MethodFilter(action='title_description_filter')

    def __init__(self, *args, **kwargs):
        super(ContentNodeFilter, self).__init__(*args, **kwargs)
        self.filters['parent'].field.queryset = self.queryset

    class Meta:
        model = models.ContentNode
        fields = ['parent']

    def title_description_filter(self, queryset, value):
        return queryset.filter(
            Q(title__icontains=value) | Q(description__icontains=value)
        )


class ContentNodeViewset(viewsets.ViewSet):
    lookup_field = 'pk'

    def list(self, request, channelmetadata_channel_id=None):
        with using_content_database(channelmetadata_channel_id):
            filtered = ContentNodeFilter(request.GET, queryset=models.ContentNode.objects.all())
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            contents = serializers.ContentNodeSerializer(filtered, context=context, many=True).data
            return Response(contents)

    def retrieve(self, request, pk=None, channelmetadata_channel_id=None):
        skip_preload = []
        if request.method == 'GET' and 'skip' in request.GET:
            skip_preload = ast.literal_eval(request.GET['skip'])
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id, 'skip_preload': skip_preload}
            content = serializers.ContentNodeSerializer(
                models.ContentNode.objects.get(pk=pk), context=context
            ).data
            return Response(content)

    @detail_route()
    def ancestor_topics(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_ancestor_topics(channel_id=None, content=None, **kwargs)
        """
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            data = serializers.ContentNodeSerializer(
                api.get_ancestor_topics(content=self.kwargs['pk']), context=context, many=True
            ).data
            return Response(data)

    @detail_route()
    def immediate_children(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        immediate_children(channel_id=None, content=None, **kwargs)
        """
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            data = serializers.ContentNodeSerializer(
                api.immediate_children(content=self.kwargs['pk']), context=context, many=True
            ).data
            return Response(data)

    @detail_route()
    def leaves(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        leaves(channel_id=None, content=None, **kwargs)
        """
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            data = serializers.ContentNodeSerializer(
                api.leaves(content=self.kwargs['pk']), context=context, many=True
            ).data
            return Response(data)

    @detail_route()
    def all_prerequisites(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_all_prerequisites(channel_id=None, content=None, **kwargs)
        """
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            data = serializers.ContentNodeSerializer(
                api.get_all_prerequisites(content=self.kwargs['pk']), context=context, many=True
            ).data
            return Response(data)

    @detail_route()
    def all_related(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_all_related(channel_id=None, content=None, **kwargs)
        """
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            data = serializers.ContentNodeSerializer(
                api.get_all_related(content=self.kwargs['pk']), context=context, many=True
            ).data
            return Response(data)

    @detail_route()
    def missing_files(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_missing_files(channel_id=None, content=None, **kwargs)
        """
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            data = serializers.FileSerializer(
                api.get_missing_files(content=self.kwargs['pk']), context=context, many=True
            ).data
            return Response(data)


class FileViewset(viewsets.ViewSet):
    def list(self, request, channelmetadata_channel_id=None):
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            files = serializers.FileSerializer(models.File.objects.all(), context=context, many=True).data
            return Response(files)

    def retrieve(self, request, pk=None, channelmetadata_channel_id=None):
        with using_content_database(channelmetadata_channel_id):
            context = {'request': request, 'channel_id': channelmetadata_channel_id}
            file = serializers.FileSerializer(
                models.File.objects.get(pk=pk), context=context
            ).data
            return Response(file)


router = routers.SimpleRouter()
router.register(r'api/content', ChannelMetadataViewSet, base_name='channelmetadata')

channel_router = routers.NestedSimpleRouter(router, r'api/content', lookup='channelmetadata')
channel_router.register(r'contentnode', ContentNodeViewset, base_name='contentnode')
channel_router.register(r'file', FileViewset, base_name='file')

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^', include(channel_router.urls)),
]
