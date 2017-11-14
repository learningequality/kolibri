from django.conf.urls import include, url
from rest_framework import routers

from .api import (ChannelMetadataViewSet, ContentNodeGranularViewset,
                  ContentNodeProgressViewset, ContentNodeViewset, FileViewset,
                  RemoteChannelViewSet, ContentNodeFileSizeViewSet)

router = routers.SimpleRouter()
router.register('channel', ChannelMetadataViewSet, base_name="channel")

router.register(r'contentnode', ContentNodeViewset, base_name='contentnode')
router.register(r'file', FileViewset, base_name='file')
router.register(r'contentnodeprogress', ContentNodeProgressViewset, base_name='contentnodeprogress')
router.register(r'contentnode_granular', ContentNodeGranularViewset, base_name='contentnode_granular')
router.register(r'remotechannel', RemoteChannelViewSet, base_name='remotechannel')
router.register(r'contentnodefilesize', ContentNodeFileSizeViewSet, base_name='contentnodefilesize')

urlpatterns = [
    url(r'^', include(router.urls)),
]
