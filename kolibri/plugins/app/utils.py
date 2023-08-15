from django.http.request import QueryDict
from django.urls import reverse

from kolibri.core.content.utils import settings
from kolibri.plugins.app.kolibri_plugin import App
from kolibri.plugins.registry import registered_plugins


SHARE_FILE = "share_file"

GET_OS_USER = "get_os_user"

CHECK_IS_METERED = "check_is_metered"

CAPABILITES = (
    SHARE_FILE,
    GET_OS_USER,
    CHECK_IS_METERED,
)


class AppInterface(object):
    __slot__ = "_capabilities"

    def __init__(self):
        self._capabilities = {}

    def __contains__(self, capability):
        return self.enabled and (capability in self._capabilities)

    def register(self, **kwargs):
        for capability in CAPABILITES:
            if capability in kwargs:
                self._capabilities[capability] = kwargs[capability]
                # override the settings module with the function
                if capability == CHECK_IS_METERED:
                    settings.using_metered_connection = kwargs[capability]

    def get_initialize_url(self, next_url=None, auth_token=None):
        if not self.enabled:
            raise RuntimeError("App plugin is not enabled")
        # Import here to prevent a circular import
        from kolibri.core.device.models import DeviceAppKey

        url = reverse(
            "kolibri:kolibri.plugins.app:initialize",
            args=(DeviceAppKey.get_app_key(),),
        )
        query_dict = QueryDict(mutable=True)

        if auth_token is not None:
            query_dict["auth_token"] = auth_token

        if next_url is not None:
            query_dict["next"] = next_url
        query_string = query_dict.urlencode()
        return url + ("?" + query_string if query_string else "")

    @property
    def enabled(self):
        return App in registered_plugins

    @property
    def capabilities(self):
        if self.enabled:
            return {key: (key in self._capabilities) for key in CAPABILITES}
        return {key: False for key in CAPABILITES}

    def share_file(self, filename, message):
        if SHARE_FILE not in self._capabilities:
            raise NotImplementedError("Sharing files is not supported on this platform")
        return self._capabilities[SHARE_FILE](filename=filename, message=message)

    def check_is_metered(self):
        if CHECK_IS_METERED not in self._capabilities:
            raise NotImplementedError(
                "Checking if the connection is metered is not supported on this platform"
            )
        return self._capabilities[CHECK_IS_METERED]()

    def get_os_user(self, auth_token):
        if GET_OS_USER not in self._capabilities:
            raise NotImplementedError(
                "Getting the OS user is not supported on this platform"
            )
        os_user, is_superuser = self._capabilities[GET_OS_USER](auth_token)
        return os_user, is_superuser


interface = AppInterface()
