from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import DeviceChannelMetadataViewSet

router = routers.SimpleRouter()

router.register('device_channel', DeviceChannelMetadataViewSet, base_name="device_channel")

urlpatterns = [
    url(r'^', include(router.urls)),
]
