from django.conf.urls import include
from django.conf.urls import url
from rest_framework import routers

from .api import DeviceInfoView
from .api import DeviceNameView
from .api import DevicePermissionsViewSet
from .api import DeviceProvisionView
from .api import DeviceSettingsView
from .api import FreeSpaceView
from .api import UserSyncStatusViewSet

router = routers.SimpleRouter()
router.register(
    r"devicepermissions", DevicePermissionsViewSet, base_name="devicepermissions"
)
router.register(r"usersyncstatus", UserSyncStatusViewSet, base_name="usersyncstatus")


urlpatterns = [
    url(r"^", include(router.urls)),
    url(
        r"^deviceprovision/",
        DeviceProvisionView.as_view({"post": "create"}),
        name="deviceprovision",
    ),
    url(r"^freespace/", FreeSpaceView.as_view({"get": "list"}), name="freespace"),
    url(r"^deviceinfo/", DeviceInfoView.as_view(), name="deviceinfo"),
    url(r"^devicesettings/", DeviceSettingsView.as_view(), name="devicesettings"),
    url(r"^devicename/", DeviceNameView.as_view(), name="devicename"),
]
