# -*- coding: utf-8 -*-
"""
Most of the api endpoints here use django_rest_framework to expose the content app APIs,
except some set methods that do not return anything.
"""
from django.conf.urls import include, url
from rest_framework import viewsets
from rest_framework.decorators import detail_route
from rest_framework.response import Response
from rest_framework_nested import routers

from . import api, models, serializers


class ChannelMetadataViewSet(viewsets.ViewSet):
    lookup_field = 'channel_id'

    def list(self, request, channel_pk=None):
        channels = serializers.ChannelMetadataSerializer(models.ChannelMetadata.objects.all(), context={'request': request}, many=True).data
        return Response(channels)

    def retrieve(self, request, pk=None, channel_id=None):
        channel = serializers.ChannelMetadataSerializer(models.ChannelMetadata.objects.get(channel_id=channel_id), context={'request': request}).data
        return Response(channel)


class ContentMetadataViewset(viewsets.ViewSet):
    lookup_field = 'content_id'

    def list(self, request, channelmetadata_channel_id=None):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        contents = serializers.ContentMetadataSerializer(
            models.ContentMetadata.objects.using(channelmetadata_channel_id).all(), context=context, many=True
        ).data
        return Response(contents)

    def retrieve(self, request, content_id=None, channelmetadata_channel_id=None):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        content = serializers.ContentMetadataSerializer(
            models.ContentMetadata.objects.using(channelmetadata_channel_id).get(content_id=content_id), context=context
        ).data
        return Response(content)

    @detail_route()
    def ancestor_topics(self, request, channelmetadata_channel_id, *args, **kwargs):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.get_ancestor_topics(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def immediate_children(self, request, channelmetadata_channel_id, *args, **kwargs):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.immediate_children(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def leaves(self, request, channelmetadata_channel_id, *args, **kwargs):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.leaves(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def all_prerequisites(self, request, channelmetadata_channel_id, *args, **kwargs):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.get_all_prerequisites(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def all_related(self, request, channelmetadata_channel_id, *args, **kwargs):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.get_all_related(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def all_formats(self, request, channelmetadata_channel_id, *args, **kwargs):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        # import pdb
        # pdb.set_trace()
        data = serializers.FormatSerializer(
            api.get_all_formats(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def available_formats(self, request, channelmetadata_channel_id, *args, **kwargs):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.FormatSerializer(
            api.get_available_formats(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def possible_formats(self, request, channelmetadata_channel_id, *args, **kwargs):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.FormatSerializer(
            api.get_possible_formats(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def files_for_quality(self, request, channelmetadata_channel_id, *args, **kwargs):
        pass

    @detail_route()
    def missing_files(self, request, channelmetadata_channel_id, *args, **kwargs):
        pass


router = routers.SimpleRouter()
router.register(r'channel', ChannelMetadataViewSet, base_name='channelmetadata')

channel_router = routers.NestedSimpleRouter(router, r'channel', lookup='channelmetadata')
channel_router.register(r'content', ContentMetadataViewset, base_name='contentmetadata')


urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^', include(channel_router.urls)),
]
