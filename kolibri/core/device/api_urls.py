from django.conf.urls import include
from django.conf.urls import url
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
    url(r"^devicerestart/", DeviceRestartView.as_view(), name="devicerestart"),
    url(r"^pathpermission/", PathPermissionView.as_view(), name="pathpermission"),
]
