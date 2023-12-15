from kolibri.core.auth.constants.user_kinds import SUPERUSER
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils.conf import OPTIONS


class DeviceManagementPlugin(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"


def any_ie11_users():
    from kolibri.core.logger.models import UserSessionLog

    return UserSessionLog.objects.filter(device_info__contains="IE,11").count() > 0


@register_hook
class DeviceManagementAsset(WebpackBundleHook):
    bundle_id = "app"

    @property
    def plugin_data(self):

        return {
            "isRemoteContent": OPTIONS["Deployment"]["REMOTE_CONTENT"],
            "canRestart": bool(OPTIONS["Deployment"]["RESTART_HOOKS"]),
            "deprecationWarnings": {
                "ie11": any_ie11_users(),
            },
        }


@register_hook
class DeviceRedirect(RoleBasedRedirectHook):
    roles = (SUPERUSER,)
    # Only do this redirect if the user is a full facility import and hence
    # more likely to be a superuser managing a device rather than a learner
    # with on their own device.
    require_full_facility = True
    # Also only do this redirect if the user is not using the 'on my own'
    # facility setup flow.
    require_no_on_my_own_facility = True

    @property
    def url(self):
        return self.plugin_url(DeviceManagementPlugin, "device_management")


@register_hook
class DeviceManagementNavItem(NavigationHook):
    bundle_id = "side_nav"
