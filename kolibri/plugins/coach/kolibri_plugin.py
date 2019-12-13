from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.auth.constants.user_kinds import COACH
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook


class Coach(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"


@register_hook
class CoachRedirect(RoleBasedRedirectHook):
    roles = (COACH,)

    @property
    def url(self):
        return self.plugin_url(Coach, "coach")


@register_hook
class CoachNavItem(NavigationHook):
    bundle_id = "side_nav"


@register_hook
class CoachAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"
