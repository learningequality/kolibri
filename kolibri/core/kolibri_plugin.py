from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.conf import settings
from django.contrib.staticfiles.templatetags.staticfiles import static
from django.utils.html import mark_safe
from django.utils.translation import get_language
from django.utils.translation import get_language_bidi
from django.utils.translation import get_language_info

import kolibri
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.oidc_provider_hook import OIDCProviderHook
from kolibri.core.theme_hook import ThemeHook
from kolibri.core.webpack.hooks import FrontEndCoreAssetHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.utils import i18n


class FrontEndCoreAppAssetHook(FrontEndCoreAssetHook):
    bundle_id = "default_frontend"

    def render_to_page_load_sync_html(self):
        """
        Generates the appropriate script tags for the bundle, be they JS or CSS
        files.

        :param bundle_data: The data returned from
        :return: HTML of script tags for insertion into a page.
        """
        tags = (
            self.plugin_data_tag()
            + self.language_font_file_tags()
            + self.frontend_message_tag()
            + list(self.js_and_css_tags())
        )

        return mark_safe("\n".join(tags))

    def language_font_file_tags(self):
        language_code = get_language()
        common_file = static("assets/fonts/noto-common.css")
        subset_file = static("assets/fonts/noto-subset.{}.css".format(language_code))
        return [
            '<link type="text/css" href="{common_css_file}?v={version}" rel="stylesheet"/>'.format(
                common_css_file=common_file, version=kolibri.__version__
            ),
            '<link type="text/css" href="{subset_css_file}?v={version}" rel="stylesheet"/>'.format(
                subset_css_file=subset_file, version=kolibri.__version__
            ),
        ]

    @property
    def plugin_data(self):
        return {
            "cacheKey": ContentCacheKey.get_cache_key(),
            "languageGlobals": self.language_globals(),
            "oidcProviderEnabled": OIDCProviderHook().is_enabled,
            "kolibriTheme": ThemeHook().theme,
        }

    def language_globals(self):
        language_code = get_language()
        lang_dir = "rtl" if get_language_bidi() else "ltr"

        languages = {}
        for code, language_name in settings.LANGUAGES:
            lang_info = next(
                (
                    lang
                    for lang in i18n.KOLIBRI_SUPPORTED_LANGUAGES
                    if lang["intl_code"] == code
                ),
                None,
            )
            languages[code] = {
                # Format to match the schema of the content Language model
                "id": code,
                "lang_name": language_name,
                "english_name": lang_info["english_name"]
                if lang_info
                else get_language_info(code)["name"],
                "lang_direction": get_language_info(code)["bidi"],
            }

        full_file = "assets/fonts/noto-full.{}.{}.css?v={}"
        full_file_modern = static(
            full_file.format(language_code, "modern", kolibri.__version__)
        )
        full_file_basic = static(
            full_file.format(language_code, "basic", kolibri.__version__)
        )
        return {
            "langCode": language_code,
            "langDir": lang_dir,
            "languages": languages,
            "fullCssFileModern": full_file_modern,
            "fullCssFileBasic": full_file_basic,
        }


class FrontEndUserAgentAssetHook(WebpackBundleHook):
    bundle_id = "user_agent"
    inline = True
