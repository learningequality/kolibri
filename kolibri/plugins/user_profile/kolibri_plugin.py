from kolibri.core.hooks import NavigationHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import translation
from kolibri.utils.translation import gettext as _


class UserProfile(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"
    can_manage_while_running = True

    @property
    def url_slug(self):
        return "profile"

    def name(self, lang):
        with translation.override(lang):
            return _("User Profile")


@register_hook
class UserAuthAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"


@register_hook
class ProfileNavAction(NavigationHook):
    bundle_id = "user_profile_side_nav"
