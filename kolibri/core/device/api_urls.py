from django.urls import include
from django.urls import re_path
from rest_framework import routers

from .api import DeviceInfoView
from .api import DeviceNameView
from .api import DevicePermissionsViewSet
from .api import DeviceProvisionView
from .api import DeviceRestartView
from .api import DeviceSettingsView
from .api import DriveInfoViewSet
from .api import FreeSpaceView
from .api import PathPermissionView
from .api import UserSyncStatusViewSet

router = routers.SimpleRouter()
router.register(
    r"devicepermissions", DevicePermissionsViewSet, basename="devicepermissions"
)
router.register(r"usersyncstatus", UserSyncStatusViewSet, basename="usersyncstatus")
router.register(r"driveinfo", DriveInfoViewSet, basename="driveinfo")


urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(
        r"^deviceprovision/",
        DeviceProvisionView.as_view({"post": "create"}),
        name="deviceprovision",
    ),
    re_path(r"^freespace/", FreeSpaceView.as_view({"get": "list"}), name="freespace"),
    re_path(r"^deviceinfo/", DeviceInfoView.as_view(), name="deviceinfo"),
    re_path(r"^devicesettings/", DeviceSettingsView.as_view(), name="devicesettings"),
    re_path(r"^devicename/", DeviceNameView.as_view(), name="devicename"),
    re_path(r"^devicerestart/", DeviceRestartView.as_view(), name="devicerestart"),
    re_path(r"^pathpermission/", PathPermissionView.as_view(), name="pathpermission"),
]
