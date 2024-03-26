from kolibri.core.auth.constants.user_kinds import ADMIN
from kolibri.core.hooks import NavigationHook
from kolibri.core.hooks import RoleBasedRedirectHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import translation
from kolibri.utils.translation import gettext as _


class FacilityManagementPlugin(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"
    can_manage_while_running = True

    def name(self, lang):
        with translation.override(lang):
            return _("Facility")


@register_hook
class FacilityManagementAsset(WebpackBundleHook):
    bundle_id = "app"


@register_hook
class FacilityRedirect(RoleBasedRedirectHook):
    roles = (ADMIN,)
    require_full_facility = True
    require_no_on_my_own_facility = True

    @property
    def url(self):
        return self.plugin_url(FacilityManagementPlugin, "facility_management")


@register_hook
class FacilityManagementNavItem(NavigationHook):
    bundle_id = "side_nav"
