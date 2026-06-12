from sys import version_info

from django.conf import settings
from morango.models import InstanceIDModel
from rest_framework import views
from rest_framework.response import Response

import kolibri
from kolibri.core.device.permissions import UserHasAnyDevicePermissions
from kolibri.utils.android import ANDROID_PLATFORM_SYSTEM_VALUE
from kolibri.utils.android import on_android
from kolibri.utils.conf import OPTIONS
from kolibri.utils.server import get_urls
from kolibri.utils.server import installation_type
from kolibri.utils.system import get_free_space
from kolibri.utils.time_utils import local_now


class DeviceInfoView(views.APIView):
    permission_classes = (UserHasAnyDevicePermissions,)

    def get(self, request, format=None):
        info = {
            "version": kolibri.__version__,
            "content_storage_free_space": get_free_space(
                OPTIONS["Paths"]["CONTENT_DIR"]
            ),
        }

        if request.user.is_superuser:
            status, urls = get_urls()
            if not urls:
                # Will not return anything when running the debug server, so at least return the current URL
                urls = [
                    request.build_absolute_uri(OPTIONS["Deployment"]["URL_PATH_PREFIX"])
                ]

            filtered_urls = [
                url for url in urls if "127.0.0.1" not in url and "localhost" not in url
            ]

            if filtered_urls:
                urls = filtered_urls

            db_engine = settings.DATABASES["default"]["ENGINE"]

            if db_engine.endswith("sqlite3"):
                # Return path to .sqlite file (usually in KOLIBRI_HOME folder)
                info["database_path"] = settings.DATABASES["default"]["NAME"]
            elif db_engine.endswith("postgresql"):
                info["database_path"] = "postgresql"
            else:
                info["database_path"] = "unknown"

            instance_model = InstanceIDModel.get_or_create_current_instance()[0]

            info["urls"] = urls
            info["device_id"] = instance_model.id
            info["os"] = (
                ANDROID_PLATFORM_SYSTEM_VALUE
                if on_android()
                else instance_model.platform
            )
            # This returns the localized time for the server
            info["server_time"] = local_now()
            # Returns the named timezone for the server (the time above only includes the offset)
            info["server_timezone"] = settings.TIME_ZONE
            info["installer"] = installation_type()
            info["python_version"] = (
                f"{version_info.major}.{version_info.minor}.{version_info.micro}"
            )

        return Response(info)
