from django.urls import include
from django.urls import path
from django.urls import re_path
from rest_framework import routers

from .viewsets.device_info import DeviceInfoView
from .viewsets.device_permissions import DevicePermissionsViewSet
from .viewsets.device_restart import DeviceRestartView
from .viewsets.device_settings import DeviceNameView
from .viewsets.device_settings import DeviceSettingsView
from .viewsets.drive_info import DriveInfoViewSet
from .viewsets.free_space import FreeSpaceView
from .viewsets.initialize_app import InitializeAppView
from .viewsets.metered_connection import CheckMeteredConnectionView
from .viewsets.path_permission import PathPermissionView
from .viewsets.user_sync_status import UserSyncStatusViewSet

router = routers.SimpleRouter()
router.register(
    r"devicepermissions", DevicePermissionsViewSet, basename="devicepermissions"
)
router.register(r"usersyncstatus", UserSyncStatusViewSet, basename="usersyncstatus")
router.register(r"driveinfo", DriveInfoViewSet, basename="driveinfo")


urlpatterns = [
    re_path(r"^", include(router.urls)),
    re_path(r"^freespace/", FreeSpaceView.as_view({"get": "list"}), name="freespace"),
    re_path(r"^deviceinfo/", DeviceInfoView.as_view(), name="deviceinfo"),
    re_path(r"^devicesettings/", DeviceSettingsView.as_view(), name="devicesettings"),
    re_path(r"^devicename/", DeviceNameView.as_view(), name="devicename"),
    re_path(r"^devicerestart/", DeviceRestartView.as_view(), name="devicerestart"),
    re_path(r"^pathpermission/", PathPermissionView.as_view(), name="pathpermission"),
    re_path(
        r"^initialize/([0-9a-f]{32})$",
        InitializeAppView.as_view(),
        name="initialize_app",
    ),
    path(
        "check_metered_connection/",
        CheckMeteredConnectionView.as_view(),
        name="check_metered_connection",
    ),
]
