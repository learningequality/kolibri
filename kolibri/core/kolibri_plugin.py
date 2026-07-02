import io
import json
import os

from django.conf import settings
from django.templatetags.static import static
from django.urls import get_resolver
from django.urls import reverse
from django.utils.html import mark_safe
from django.utils.translation import get_language
from django.utils.translation import get_language_bidi
from django.utils.translation import get_language_info
from django_js_reverse.core import generate_json

from kolibri.core.content.hooks import ShareFileHook
from kolibri.core.content.utils.paths import get_content_storage_url
from kolibri.core.content.utils.paths import get_sandbox_path
from kolibri.core.content.utils.paths import get_zip_content_base_path
from kolibri.core.content.utils.paths import get_zip_content_config
from kolibri.core.device.hooks import CheckIsMeteredHook
from kolibri.core.hooks import FrontEndBaseHeadHook
from kolibri.core.hooks import NavigationHook
from kolibri.core.oidc_provider_hook import OIDCProviderHook
from kolibri.core.theme_hook import ThemeHook
from kolibri.core.webpack.hooks import WebpackBundleHook
from kolibri.plugins.hooks import register_hook
from kolibri.utils import i18n
from kolibri.utils.conf import OPTIONS

# Load font CSS hash manifest
_font_css_manifest_file = os.path.join(
    os.path.dirname(__file__), "constants", "font_css_hashes.json"
)

with io.open(_font_css_manifest_file, mode="r", encoding="utf-8") as f:
    FONT_CSS_HASHES = json.load(f)


@register_hook
class FrontEndCoreAppAssetHook(WebpackBundleHook):
    bundle_id = "default_frontend"

    def navigation_tags(self):
        return [
            hook.render_to_page_load_sync_html()
            for hook in NavigationHook.registered_hooks
        ]

    @staticmethod
    def _first_js_url(hook):
        return next(
            chunk["url"] for chunk in hook.bundle if chunk["name"].endswith(".js")
        )

    def _polyfill_loader_tag(self):
        polyfill_url = self._first_js_url(FrontEndPolyfillAssetHook())
        loader_url = self._first_js_url(FrontEndPolyfillLoaderHook())
        return (
            f'<script type="text/javascript" src="{loader_url}"'
            f' data-polyfill-url="{polyfill_url}"></script>'
        )

    def render_to_page_load_sync_html(self):
        """
        Don't render the frontend message files in the usual way
        as the global object to register them does not exist yet.
        Instead they are loaded through plugin data.
        """
        tags = (
            self.plugin_data_tag()
            + [self._polyfill_loader_tag()]
            + list(self.js_and_css_tags())
            + self.navigation_tags()
        )

        return mark_safe("\n".join(tags))

    @property
    def plugin_data(self):
        language_code = get_language()

        # Get hashed CSS filenames from manifest
        modern_original = f"noto-full.{language_code}.modern.css"
        basic_original = f"noto-full.{language_code}.basic.css"
        modern_hashed = FONT_CSS_HASHES[modern_original]
        basic_hashed = FONT_CSS_HASHES[basic_original]

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
                "__sandboxUrl": get_sandbox_path(),
                "__zipContentOrigin": zip_content_origin,
                "__zipContentPort": zip_content_port,
            }
        )
        return {
            "fullCSSFileModern": static(f"assets/fonts/{modern_hashed}"),
            "fullCSSFileBasic": static(f"assets/fonts/{basic_hashed}"),
            "appCapabilities": {
                "check_is_metered": CheckIsMeteredHook.is_registered,
                "share_file": ShareFileHook.is_registered,
            },
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
class FrontEndPolyfillAssetHook(WebpackBundleHook):
    bundle_id = "polyfills"


@register_hook
class FrontEndPolyfillLoaderHook(WebpackBundleHook):
    bundle_id = "polyfill_loader"


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

        # Get hashed CSS filenames from manifest
        common_hashed = FONT_CSS_HASHES["noto-common.css"]
        subset_original = f"noto-subset.{language_code}.css"
        subset_hashed = FONT_CSS_HASHES[subset_original]

        common_file = static(f"assets/fonts/{common_hashed}")
        subset_file = static(f"assets/fonts/{subset_hashed}")

        return [
            f'<link type="text/css" href="{common_file}" rel="preload" as="style"/>',
            f'<link type="text/css" href="{common_file}" rel="stylesheet"/>',
            f'<link type="text/css" href="{subset_file}" rel="preload" as="style"/>',
            f'<link type="text/css" href="{subset_file}" rel="stylesheet"/>',
        ]
