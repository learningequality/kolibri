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
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.utils import i18n


class FrontEndCoreAppAssetHook(WebpackBundleHook):
    bundle_id = "default_frontend"

    def render_to_page_load_sync_html(self):
        """
        Don't render the frontend message files in the usual way
        as the global object to register them does not exist yet.
        Instead they are loaded through plugin data.
        """
        tags = self.plugin_data_tag() + list(self.js_and_css_tags())

        return mark_safe("\n".join(tags))

    @property
    def plugin_data(self):
        return {
            "contentCacheKey": ContentCacheKey.get_cache_key(),
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
        return {
            "coreMessages": self.frontend_messages(),
            "languageCode": language_code,
            "languageDir": lang_dir,
            "languages": languages,
        }


class FrontEndUserAgentAssetHook(WebpackBundleHook):
    bundle_id = "user_agent"
    inline = True

    def render_to_page_load_sync_html(self):
        """
        Add in the extra language font file tags needed
        for preloading our custom font files.
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
        language_code = get_language()
        static_root = static("assets/fonts/noto-full")
        full_file = "{}.{}.{}.css?v={}"
        return {
            "fullCSSFileModern": full_file.format(
                static_root, language_code, "modern", kolibri.__version__
            ),
            "fullCSSFileBasic": full_file.format(
                static_root, language_code, "basic", kolibri.__version__
            ),
        }
