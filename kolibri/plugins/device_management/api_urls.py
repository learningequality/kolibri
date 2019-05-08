from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import ContentNodeGranularViewset
from .api import DeviceChannelMetadataViewSet
from .api import get_file_size_and_count

router = routers.SimpleRouter()

router.register(
    "device_channel", DeviceChannelMetadataViewSet, base_name="device_channel"
)
router.register(
    r"contentnode_granular",
    ContentNodeGranularViewset,
    base_name="contentnode_granular",
)

urlpatterns = [
    url(r"^", include(router.urls)),
    url(r"sizecount", get_file_size_and_count, name="size_and_count"),
]
