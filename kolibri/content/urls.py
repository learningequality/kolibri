# -*- coding: utf-8 -*-
"""
Most of the api endpoints here use django_rest_framework to expose the content app APIs,
except some set methods that do not return anything.
"""
from django.conf.urls import include, url
from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.routers import DefaultRouter

from . import api, models, serializers


@api_view(('GET',))
def api_root(request, format=None):
    return Response({
        'content': reverse('content-list', args=('channel_id', 'content_id', 'api_method'), request=request, format=format),
        'content_of_kind': reverse('content-list', args=('channel_id', 'content_id', 'kind', 'api_method'), request=request, format=format),
        'content_relationship': reverse('content-relationship', args=('channel_id', 'content1', 'content2', 'api_method'), request=request, format=format),
        'format': reverse('format-list', args=('channel_id', 'content_id', 'api_method'), request=request, format=format),
        'file': reverse('file-list', args=('channel_id', 'content_id', 'api_method'), request=request, format=format),
        'file_of_quality': reverse('file-list', args=('channel_id', 'content_id', 'format_quality', 'api_method'), request=request, format=format),
    })


class ChannelMetadataList(viewsets.ModelViewSet):
    queryset = models.ChannelMetadata.objects.all()
    serializer_class = serializers.ChannelMetadataSerializer


class ContentMetadataList(viewsets.ModelViewSet):
    queryset = models.ContentMetadata.objects.all()
    serializer_class = serializers.ContentMetadataSerializer


class LicenseList(viewsets.ModelViewSet):
    queryset = models.License.objects.all()
    serializer_class = serializers.LicenseSerializer


class ContentList(generics.ListAPIView):
    serializer_class = serializers.ContentMetadataSerializer

    def get_queryset(self):
        channel_id = self.kwargs['channel_id']
        content_id = self.kwargs['content_id']
        api_method = self.kwargs['api_method']
        try:
            kind = self.kwargs['kind']
            return getattr(api, api_method)(channel_id=channel_id, content=content_id, kind=kind)
        except KeyError:
            return getattr(api, api_method)(channel_id=channel_id, content=content_id)


class ContentCreate(generics.CreateAPIView):
    serializer_class = serializers.ContentMetadataSerializer

    def post(self, request, *args, **kwargs):
        channel_id = self.kwargs['channel_id']
        content1 = self.kwargs['content1']
        content2 = self.kwargs['content2']
        api_method = self.kwargs['api_method']
        if api_method == 'set_prerequisite' or api_method == 'set_is_related':
            try:
                getattr(api, api_method)(channel_id=channel_id, content1=content1, content2=content2)
                return Response(status=status.HTTP_200_OK)
            except Exception, e:
                return Response(str(e), status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


class FormatList(generics.ListAPIView):
    serializer_class = serializers.FormatSerializer

    def get_queryset(self):
        channel_id = self.kwargs['channel_id']
        content_id = self.kwargs['content_id']
        api_method = self.kwargs['api_method']
        return getattr(api, api_method)(channel_id=channel_id, content=content_id)


class FileList(generics.ListAPIView):
    serializer_class = serializers.FileSerializer

    def get_queryset(self):
        channel_id = self.kwargs['channel_id']
        content_id = self.kwargs['content_id']
        api_method = self.kwargs['api_method']
        try:
            format_quality = self.kwargs['format_quality']
            return getattr(api, api_method)(channel_id=channel_id, content=content_id, format_quality=format_quality)
        except KeyError:
            return getattr(api, api_method)(channel_id=channel_id, content=content_id)

router = DefaultRouter()
router.register(r'channelmetadata', ChannelMetadataList)
router.register(r'contentmetadata', ContentMetadataList)
router.register(r'license', LicenseList)

urlpatterns = [
    url(r'^content/', include(router.urls)),
    url(r'^content_api/$', api_root),
    url(r'^content_api/(?P<channel_id>.*)/content/(?P<content_id>.*)/(?P<kind>.*)/(?P<api_method>.*)/$', ContentList.as_view(), name='content-list'),
    url(r'^content_api/(?P<channel_id>.*)/content/(?P<content_id>.*)/(?P<api_method>.*)/$', ContentList.as_view(), name='content-list'),
    url(r'^content_api/(?P<channel_id>.*)/content_relationship/(?P<content1>.*)/(?P<content2>.*)/(?P<api_method>.*)/$', ContentCreate.as_view(),
        name='content-relationship'),
    url(r'^content_api/(?P<channel_id>.*)/format/(?P<content_id>.*)/(?P<api_method>.*)/$', FormatList.as_view(), name='format-list'),
    url(r'^content_api/(?P<channel_id>.*)/file/(?P<content_id>.*)/(?P<format_quality>.*)/(?P<api_method>.*)/$', FileList.as_view(), name='file-list'),
    url(r'^content_api/(?P<channel_id>.*)/file/(?P<content_id>.*)/(?P<api_method>.*)/$', FileList.as_view(), name='file-list'),
]
