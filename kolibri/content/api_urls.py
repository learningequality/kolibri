from django.conf.urls import include, url
from rest_framework import routers

from .api import ChannelMetadataCacheViewSet, ContentNodeProgressViewset, ContentNodeViewset, FileViewset, ChannelFileSummaryViewSet

router = routers.SimpleRouter()
router.register('content', ChannelMetadataCacheViewSet, base_name="channel")

content_router = routers.SimpleRouter()
content_router.register(r'contentnode', ContentNodeViewset, base_name='contentnode')
content_router.register(r'file', FileViewset, base_name='file')
content_router.register(r'filesummary', ChannelFileSummaryViewSet, base_name="filesummary")
content_router.register(r'contentnodeprogress', ContentNodeProgressViewset, base_name='contentnodeprogress')

urlpatterns = [
    url(r'^', include(router.urls)),
    url(r'^content/(?P<channel_id>[^/.]+)/', include(content_router.urls)),
]
