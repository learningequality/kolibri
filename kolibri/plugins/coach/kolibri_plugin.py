from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from . import hooks
from kolibri.core.auth.constants.user_kinds import COACH
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins.base import KolibriPluginBase


class Coach(KolibriPluginBase):
    def url_module(self):
        from . import urls
        return urls

    def url_slug(self):
        return "^coach/"


class CoachRedirect(RoleBasedRedirectHook):
    role = COACH

    @property
    def url(self):
        return self.plugin_url(Coach, 'coach')


class CoachNavItem(NavigationHook, webpack_hooks.WebpackBundleHook):
    unique_slug = "coach_side_nav"
    src_file = "assets/src/views/CoachSideNavEntry.vue"


class CoachAsset(webpack_hooks.WebpackBundleHook):
    unique_slug = "coach_module"
    src_file = "assets/src/app.js"


class CoachInclusionHook(hooks.CoachSyncHook):
    bundle_class = CoachAsset
