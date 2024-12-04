from django.conf import settings
from django.templatetags.static import static
from django.urls import get_resolver
from django.urls import reverse
from django.utils.html import mark_safe
from django.utils.translation import get_language
from django.utils.translation import get_language_bidi
from django.utils.translation import get_language_info
from django_js_reverse.core import generate_json

import kolibri
from kolibri.core.content.utils.paths import get_content_storage_url
from kolibri.core.content.utils.paths import get_hashi_path
from kolibri.core.content.utils.paths import get_zip_content_base_path
from kolibri.core.content.utils.paths import get_zip_content_config
from kolibri.core.device.utils import allow_other_browsers_to_connect
from kolibri.core.hooks import FrontEndBaseHeadHook
from kolibri.core.hooks import NavigationHook
from kolibri.core.oidc_provider_hook import OIDCProviderHook
from kolibri.core.theme_hook import ThemeHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.app.utils import interface
from kolibri.plugins.hooks import register_hook
from kolibri.utils import i18n
from kolibri.utils.conf import OPTIONS


@register_hook
class FrontEndCoreAppAssetHook(WebpackBundleHook):
    bundle_id = "default_frontend"

    def navigation_tags(self):
        return [
            hook.render_to_page_load_sync_html()
            for hook in NavigationHook.registered_hooks
        ]

    def render_to_page_load_sync_html(self):
        """
        Don't render the frontend message files in the usual way
        as the global object to register them does not exist yet.
        Instead they are loaded through plugin data.
        """
        tags = (
            self.plugin_data_tag()
            + list(self.js_and_css_tags())
            + self.navigation_tags()
        )

        return mark_safe("\n".join(tags))

    @property
    def plugin_data(self):
        language_code = get_language()
        static_root = static("assets/fonts/noto-full")
        full_file = "{}.{}.{}.css?v={}"

        default_urlresolver = get_resolver(None)

        url_data = generate_json(default_urlresolver)

        # Convert the urls key, value pairs to a dictionary
        # Turn all dashes in keys into underscores
        # This should maintain consistency with our naming, as all namespaces
        # are either 'kolibri:core' or 'kolibri:plugin_module_path'
        # neither of which can contain dashes.
        url_data["urls"] = {
            key.replace("-", "_"): value for key, value in url_data["urls"]
        }

        zip_content_origin, zip_content_port = get_zip_content_config()

        url_data.update(
            {
                "__staticUrl": settings.STATIC_URL,
                "__mediaUrl": settings.MEDIA_URL,
                "__contentUrl": get_content_storage_url(
                    baseurl=OPTIONS["Deployment"]["URL_PATH_PREFIX"]
                ),
                "__zipContentUrl": get_zip_content_base_path(),
                "__hashiUrl": get_hashi_path(),
                "__zipContentOrigin": zip_content_origin,
                "__zipContentPort": zip_content_port,
            }
        )
        return {
            "fullCSSFileModern": full_file.format(
                static_root, language_code, "modern", kolibri.__version__
            ),
            "fullCSSFileBasic": full_file.format(
                static_root, language_code, "basic", kolibri.__version__
            ),
            "allowRemoteAccess": allow_other_browsers_to_connect()
            or not interface.enabled,
            "appCapabilities": interface.capabilities,
            "languageGlobals": self.language_globals(),
            "oidcProviderEnabled": OIDCProviderHook.is_enabled(),
            "kolibriTheme": ThemeHook.get_theme(),
            "urls": url_data,
            "unsupportedUrl": reverse("kolibri:core:unsupported"),
        }

    def language_globals(self):
        language_code = get_language()
        lang_dir = "rtl" if get_language_bidi() else "ltr"

        languages = {}
        for code, language_name in settings.LANGUAGES:
            lang_info = i18n.KOLIBRI_LANGUAGE_INFO[code]
            languages[code] = {
                # Format to match the schema of the content Language model
                "id": code,
                "lang_name": language_name,
                "english_name": lang_info["english_name"]
                if lang_info
                else get_language_info(code)["name"],
                "lang_direction": "rtl" if get_language_info(code)["bidi"] else "ltr",
            }
        return {
            "coreLanguageMessages": self.frontend_messages(),
            "languageCode": language_code,
            "languageDir": lang_dir,
            "languages": languages,
        }


@register_hook
class FrontendHeadAssetsHook(FrontEndBaseHeadHook):
    """
    Render these assets in the <head> tag of base.html, before other JS and assets.
    """

    @property
    def head_html(self):
        return mark_safe("\n".join(self.language_font_file_tags()))

    def language_font_file_tags(self):
        language_code = get_language()
        common_file = static("assets/fonts/noto-common.css")
        subset_file = static("assets/fonts/noto-subset.{}.css".format(language_code))
        return [
            '<link type="text/css" href="{common_css_file}?v={version}" rel="preload" as="style"/>'.format(
                common_css_file=common_file, version=kolibri.__version__
            ),
            '<link type="text/css" href="{common_css_file}?v={version}" rel="stylesheet"/>'.format(
                common_css_file=common_file, version=kolibri.__version__
            ),
            '<link type="text/css" href="{common_css_file}?v={version}" rel="preload" as="style"/>'.format(
                common_css_file=subset_file, version=kolibri.__version__
            ),
            '<link type="text/css" href="{subset_css_file}?v={version}" rel="stylesheet"/>'.format(
                subset_css_file=subset_file, version=kolibri.__version__
            ),
        ]
