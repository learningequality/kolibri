from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .viewsets.device import CalculateImportExportSizeView
from .viewsets.device import DeviceChannelMetadataViewSet
from .viewsets.device import DeviceChannelOrderView

router = routers.SimpleRouter()

router.register(
    "device_channel", DeviceChannelMetadataViewSet, basename="device_channel"
)

urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(
        r"devicechannelorder",
        DeviceChannelOrderView.as_view(),
        name="devicechannelorder",
    ),
    re_path(
        r"importexportsizeview",
        CalculateImportExportSizeView.as_view(),
        name="importexportsizeview",
    ),
]
