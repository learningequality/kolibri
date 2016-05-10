# -*- coding: utf-8 -*-
"""
Most of the api endpoints here use django_rest_framework to expose the content app APIs,
except some set methods that do not return anything.
"""
from django.conf.urls import include, url
from kolibri.content import api, models, serializers
from rest_framework import viewsets
from rest_framework.decorators import detail_route
from rest_framework.response import Response
from rest_framework_nested import routers


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
        """
        endpoint for content api method
        get_ancestor_topics(channel_id=None, content=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.get_ancestor_topics(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def immediate_children(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        immediate_children(channel_id=None, content=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.immediate_children(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def leaves(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        leaves(channel_id=None, content=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.leaves(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def all_prerequisites(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_all_prerequisites(channel_id=None, content=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.get_all_prerequisites(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def all_related(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_all_related(channel_id=None, content=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.get_all_related(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def missing_files(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_missing_files(channel_id=None, content=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.FileSerializer(
            api.get_missing_files(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    @detail_route()
    def all_presets(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_all_presets(channel_id=None, content=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.FileSerializer(
            api.get_all_presets(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id']), context=context, many=True
        ).data
        return Response(data)

    def files_for_quality(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        get_files_for_quality(channel_id=None, content=None, format_quality=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.FileSerializer(
            api.get_files_for_quality(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id'], format_quality=self.kwargs['quality']),
            context=context,
            many=True
        ).data
        return Response(data)

    def set_prerequisite(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        set_prerequisite(channel_id=None, content1=None, content2=None, **kwargs)
        """
        return Response(api.set_prerequisite(channel_id=channelmetadata_channel_id, content1=self.kwargs['content_id'], content2=self.kwargs['prerequisite']))

    def set_is_related(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        set_is_related(channel_id=None, content1=None, content2=None, **kwargs)
        """
        return Response(api.set_is_related(channel_id=channelmetadata_channel_id, content1=self.kwargs['content_id'], content2=self.kwargs['related']))

    def children_of_kind(self, request, channelmetadata_channel_id, *args, **kwargs):
        """
        endpoint for content api method
        children_of_kind(channel_id=None, content=None, kind=None, **kwargs)
        """
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        data = serializers.ContentMetadataSerializer(
            api.children_of_kind(channel_id=channelmetadata_channel_id, content=self.kwargs['content_id'], kind=self.kwargs['kind']), context=context, many=True
        ).data
        return Response(data)


class FileViewset(viewsets.ViewSet):
    def list(self, request, channelmetadata_channel_id=None):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        files = serializers.FileSerializer(models.File.objects.using(channelmetadata_channel_id).all(), context=context, many=True).data
        return Response(files)

    def retrieve(self, request, pk=None, channelmetadata_channel_id=None):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        file = serializers.FileSerializer(
            models.File.objects.using(channelmetadata_channel_id).get(pk=pk), context=context
        ).data
        return Response(file)

    def update_content_copy(self, request, channelmetadata_channel_id, pk, content_copy, *args, **kwargs):
        """
        endpoint for content api method
        update_content_copy(file_object=None, content_copy=None)
        """
        target_file = models.File.objects.using(channelmetadata_channel_id).get(pk=pk)
        return Response(api.update_content_copy(file_object=target_file, content_copy=str(content_copy)))


class FormatPresetViewset(viewsets.ViewSet):
    def list(self, request, channelmetadata_channel_id=None):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        files = serializers.FormatPresetSerializer(models.FormatPreset.objects.using(channelmetadata_channel_id).all(), context=context, many=True).data
        return Response(files)

    def retrieve(self, request, pk=None, channelmetadata_channel_id=None):
        context = {'request': request, 'channel_id': channelmetadata_channel_id}
        file = serializers.FormatPresetSerializer(
            models.FormatPreset.objects.using(channelmetadata_channel_id).get(pk=pk), context=context
        ).data
        return Response(file)


router = routers.SimpleRouter()
router.register(r'channel', ChannelMetadataViewSet, base_name='channelmetadata')

channel_router = routers.NestedSimpleRouter(router, r'channel', lookup='channelmetadata')
channel_router.register(r'content', ContentMetadataViewset, base_name='contentmetadata')
channel_router.register(r'file', FileViewset, base_name='file')
channel_router.register(r'preset', FormatPresetViewset, base_name='preset')


urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^', include(channel_router.urls)),
    url(r'^channel/(?P<channelmetadata_channel_id>[^/.]+)/content/(?P<content_id>[^/.]+)/files_for_quality/(?P<quality>\w+)',
        ContentMetadataViewset.as_view({'get': 'files_for_quality'})),
    url(r'^channel/(?P<channelmetadata_channel_id>[^/.]+)/content/(?P<content_id>[^/.]+)/children_of_kind/(?P<kind>\w+)',
        ContentMetadataViewset.as_view({'get': 'children_of_kind'})),
    url(r'^channel/(?P<channelmetadata_channel_id>[^/.]+)/content/(?P<content_id>[^/.]+)/set_prerequisite/(?P<prerequisite>[^/.]+)',
        ContentMetadataViewset.as_view({'put': 'set_prerequisite'})),
    url(r'^channel/(?P<channelmetadata_channel_id>[^/.]+)/content/(?P<content_id>[^/.]+)/set_is_related/(?P<related>[^/.]+)',
        ContentMetadataViewset.as_view({'put': 'set_is_related'})),
    url(r'^channel/(?P<channelmetadata_channel_id>[^/.]+)/file/(?P<pk>[^/.]+)/update_content_copy/(?P<content_copy>.*)',
        FileViewset.as_view({'put': 'update_content_copy'})),
]
