"""
Kolibri template tags
=====================
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import copy
import json
import logging
import re

from django import template
from django.conf import settings
from django.contrib.staticfiles.templatetags.staticfiles import static
from django.core.urlresolvers import get_resolver
from django.core.urlresolvers import get_script_prefix
from django.core.urlresolvers import resolve
from django.core.urlresolvers import reverse
from django.template.loader import render_to_string
from django.utils.html import mark_safe
from django.utils.translation import get_language
from django.utils.translation import get_language_bidi
from django.utils.translation import get_language_info
from django_js_reverse.core import prepare_url_list
from django_js_reverse.rjsmin import jsmin
from rest_framework.renderers import JSONRenderer
from six import iteritems

import kolibri
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.hooks import NavigationHook
from kolibri.core.theme_hook import ThemeHook
from kolibri.core.oidc_provider_hook import OIDCProviderHook
from kolibri.core.webpack.utils import webpack_asset_render
from kolibri.utils import conf
from kolibri.utils import i18n

register = template.Library()

logger = logging.getLogger(__name__)


@register.simple_tag()
def kolibri_content_cache_key():
    js = """
    <script>
      var contentCacheKey = '{cache_key}';
    </script>
    """.format(
        cache_key=ContentCacheKey.get_cache_key()
    )
    return mark_safe(js)


@register.simple_tag(takes_context=True)
def kolibri_language_globals(context):

    template = """
    <script>
      var languageCode = '{lang_code}';
      var languageDir = '{lang_dir}';
      var languages = JSON.parse('{languages}');
      var fullCSSFileModern = '{full_css_file_modern}?v={version}';
      var fullCSSFileBasic = '{full_css_file_basic}?v={version}';
    </script>
    <link type="text/css" href="{common_css_file}?v={version}" rel="stylesheet"/>
    <link type="text/css" href="{subset_css_file}?v={version}" rel="stylesheet"/>
    """

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

    common_file = static("assets/fonts/noto-common.css")
    subset_file = static("assets/fonts/noto-subset.{}.css".format(language_code))
    full_file = "assets/fonts/noto-full.{}.{}.css"
    full_file_modern = static(full_file.format(language_code, "modern"))
    full_file_basic = static(full_file.format(language_code, "basic"))

    return mark_safe(
        template.format(
            lang_code=language_code,
            lang_dir=lang_dir,
            languages=json.dumps(languages),
            common_css_file=common_file,
            subset_css_file=subset_file,
            full_css_file_modern=full_file_modern,
            full_css_file_basic=full_file_basic,
            # Temporary cache busting strategy.
            # Would be better to use ManifestStaticFilesStorage
            version=kolibri.__version__,
        )
    )


@register.simple_tag()
def kolibri_navigation_actions():
    """
    A tag to include an initial JS-object to bootstrap nav action data into the app.
    :return: An html string
    """
    return webpack_asset_render(NavigationHook)


@register.simple_tag()
def enable_oidc_provider():
    """
    Specify whether or not the oidc_provider plugin is enabled
    """
    template = """
    <script>
      var oidcProviderEnabled = {};
    </script>
    """
    return mark_safe(
        template.format("true" if OIDCProviderHook().is_enabled else "false")
    )


@register.simple_tag()
def kolibri_theme():
    """
    A tag to include a theme configuration object to add custom theming to Kolibri.
    :return: An html string
    """
    template = """
    <script>
      var kolibriTheme = JSON.parse('{theme}');
    </script>
    """
    return mark_safe(template.format(theme=json.dumps(ThemeHook().theme)))


@register.simple_tag(takes_context=True)
def kolibri_set_urls(context):
    # Modified from:
    # https://github.com/ierror/django-js-reverse/blob/master/django_js_reverse/core.py#L101
    js_global_object_name = "window"
    js_var_name = "kolibriUrls"
    script_prefix = get_script_prefix()

    if "request" in context:
        default_urlresolver = get_resolver(getattr(context["request"], "urlconf", None))
    else:
        default_urlresolver = get_resolver(None)

    js = render_to_string(
        "django_js_reverse/urls_js.tpl",
        {
            "urls": sorted(list(prepare_url_list(default_urlresolver))),
            "url_prefix": script_prefix,
            "js_var_name": js_var_name,
            "js_global_object_name": js_global_object_name,
        },
    )

    return mark_safe(
        """<script type="text/javascript">"""
        + jsmin(js)
        + """
        {global_object}.staticUrl = '{static_url}';
        {global_object}.mediaUrl = '{media_url}';
        </script>
        """.format(
            global_object=js_global_object_name,
            static_url=settings.STATIC_URL,
            media_url=settings.MEDIA_URL,
        )
    )


@register.simple_tag(takes_context=True)
def kolibri_bootstrap_model(context, base_name, api_resource, **kwargs):
    response, kwargs = _kolibri_bootstrap_helper(
        context, base_name, api_resource, "detail", **kwargs
    )
    html = (
        "<script type='text/javascript'>"
        "var model = {0}.resources.{1}.createModel(JSON.parse({2}));"
        "model.synced = true;"
        "</script>".format(
            conf.KOLIBRI_CORE_JS_NAME,
            api_resource,
            json.dumps(JSONRenderer().render(response.data).decode("utf-8")),
        )
    )
    return mark_safe(html)


@register.simple_tag(takes_context=True)
def kolibri_bootstrap_collection(context, base_name, api_resource, **kwargs):
    response, kwargs = _kolibri_bootstrap_helper(
        context, base_name, api_resource, "list", **kwargs
    )
    html = (
        "<script type='text/javascript'>"
        "var collection = {0}.resources.{1}.createCollection({2}, JSON.parse({3}));"
        "collection.synced = true;"
        "</script>".format(
            conf.KOLIBRI_CORE_JS_NAME,
            api_resource,
            json.dumps(kwargs),
            json.dumps(JSONRenderer().render(response.data).decode("utf-8")),
        )
    )
    return mark_safe(html)


def _replace_dict_values(check, replace, dict):
    for (key, value) in iteritems(dict):
        if dict[key] is check:
            dict[key] = replace


def _kolibri_bootstrap_helper(context, base_name, api_resource, route, **kwargs):
    reversal = dict()
    kwargs_check = "kwargs_"
    # remove prepended string and matching items from kwargs
    for key in list(kwargs.keys()):
        if kwargs_check in key:
            item = kwargs.pop(key)
            key = re.sub(kwargs_check, "", key)
            reversal[key] = item
    view, view_args, view_kwargs = resolve(
        reverse("kolibri:core:{0}-{1}".format(base_name, route), kwargs=reversal)
    )
    # switch out None temporarily because invalid filtering and caching can occur
    _replace_dict_values(None, str(""), kwargs)
    request = copy.copy(context["request"])
    request.GET = request.GET.copy()
    for key in kwargs:
        request.GET[key] = kwargs[key]
    response = view(request, **view_kwargs)
    _replace_dict_values(str(""), None, kwargs)
    return response, kwargs


@register.simple_tag()
def kolibri_sentry_error_reporting():

    if not conf.OPTIONS["Debug"]["SENTRY_FRONTEND_DSN"]:
        return ""

    template = """
      <script>
        var sentryDSN = '{dsn}';
        var sentryEnv = '{env}';
      </script>
    """
    return mark_safe(
        template.format(
            dsn=conf.OPTIONS["Debug"]["SENTRY_FRONTEND_DSN"],
            env=conf.OPTIONS["Debug"]["SENTRY_ENVIRONMENT"],
        )
    )
