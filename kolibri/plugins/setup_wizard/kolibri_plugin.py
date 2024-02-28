from kolibri.core.device.hooks import SetupHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import translation
from kolibri.utils.translation import gettext as _


class SetupWizardPlugin(KolibriPluginBase):
    untranslated_view_urls = "api_urls"
    translated_view_urls = "urls"

    @property
    def url_slug(self):
        return "setup"

    def name(self, lang):
        with translation.override(lang):
            return _("Setup Wizard")

    @property
    def plugin_data(self):
        return {}


@register_hook
class SetupWizardAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"


@register_hook
class SetupWizardHook(SetupHook):
    @property
    def url(self):
        return self.plugin_url(SetupWizardPlugin, "setupwizard")
