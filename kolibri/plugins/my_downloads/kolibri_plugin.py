from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from kolibri.core.hooks import NavigationHook
from kolibri.core.webpack import hooks as webpack_hooks
from kolibri.plugins import KolibriPluginBase
from kolibri.plugins.hooks import register_hook
from kolibri.utils import translation
from kolibri.utils.translation import ugettext as _


class MyDownloads(KolibriPluginBase):
    translated_view_urls = "urls"
    untranslated_view_urls = "api_urls"
    can_manage_while_running = True

    def name(self, lang):
        with translation.override(lang):
            return _("My downloads")


@register_hook
class MyDownloadsAsset(webpack_hooks.WebpackBundleHook):
    bundle_id = "app"


@register_hook
class MyDownloadsNavAction(NavigationHook):
    bundle_id = "my_downloads_side_nav"
