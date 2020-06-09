from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import CalculateImportExportSizeView
from .api import DeviceChannelMetadataViewSet
from .api import DeviceChannelOrderView
from .api import RemoteAccess

router = routers.SimpleRouter()

router.register(
    "device_channel", DeviceChannelMetadataViewSet, base_name="device_channel"
)

urlpatterns = [
    url(r"^", include(router.urls)),
    url(
        r"devicechannelorder",
        DeviceChannelOrderView.as_view(),
        name="devicechannelorder",
    ),
    url(
        r"importexportsizeview",
        CalculateImportExportSizeView.as_view(),
        name="importexportsizeview",
    ),
    url(r"allowremoteaccess", RemoteAccess.as_view(), name="allowremoteaccess",),
]
