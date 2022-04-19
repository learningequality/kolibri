from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import COACH
from kolibri.core.device.utils import get_device_setting
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class Coach(KolibriPluginBase):
    untranslated_view_urls = "api_urls"

    @property
    def translated_view_urls(self):
        # On an SoUD this plugin should be disabled. In lieu of properly
        # disabling the plugin, we will just not register any urls for now
        if not get_device_setting("subset_of_users_device", False):
            return "urls"
        return None


@register_hook
class CoachRedirect(RoleBasedRedirectHook):
    roles = (COACH,)

    @property
    def url(self):
        # Also disable attempting to redirect to the coach page
        # if we are on a subset of users device.
        if not get_device_setting("subset_of_users_device", False):
            return self.plugin_url(Coach, "coach")


@register_hook
class CoachNavItem(NavigationHook):
    bundle_id = "side_nav"


@register_hook
class CoachAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"

    @property
    def plugin_data(self):
        from kolibri.core.content.models import ContentNode

        practice_quizzes_exist = ContentNode.objects.filter(
            available=True, options__contains='"modality": "QUIZ"'
        ).exists()
        return {
            "practice_quizzes_exist": practice_quizzes_exist,
        }
