from django.conf.urls import include, url
from rest_framework import routers

from .api import ChannelMetadataViewSet, ContentNodeProgressViewset, ContentNodeViewset, FileViewset

router = routers.SimpleRouter()
router.register('channel', ChannelMetadataViewSet, base_name="channel")

router.register(r'contentnode', ContentNodeViewset, base_name='contentnode')
router.register(r'file', FileViewset, base_name='file')
router.register(r'contentnodeprogress', ContentNodeProgressViewset, base_name='contentnodeprogress')

urlpatterns = [
    url(r'^', include(router.urls)),
]
