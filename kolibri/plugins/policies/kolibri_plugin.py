from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import translation
from kolibri.utils.translation import gettext as _


class Policies(KolibriPluginBase):
    translated_view_urls = "urls"

    @property
    def url_slug(self):
        return "policies"

    def name(self, lang):
        with translation.override(lang):
            return _("Policies")


@register_hook
class PoliciesAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"
