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

import user_agents
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
        cache_key=ContentCacheKey.get_cache_key(),
    )
    return mark_safe(js)


def _supports_modern_fonts(request):
    """
    In order to use the modern font-loading strategy we need to ensure two things:

    1. The browser needs to properly use the font-face unicode-range descriptor in order
       only load fonts when they are needed. This allows us to reference fonts for every
       supported alphabet while ensuring that the client doesn't download many megabytes
       of font data.

    2. The browser needs to avoid a flash of invisible text (FOIT) while extra fonts are
       loading, and instead render text using the browser's default fonts (FOUT). This
       allows users to view and begin reading text, even if the fonts haven't loaded yet.
       With some browsers this means supporting the new font-display descriptor. The
       Edge browser uses FOUT instead of FOIT by default, and therefore doesn't need to
       support font-display.

    Based on https://caniuse.com/#feat=font-unicode-range
    """

    if 'HTTP_USER_AGENT' not in request.META:
        return False

    browser = user_agents.parse(request.META['HTTP_USER_AGENT']).browser

    if browser.family == "Edge":  # Edge only needs unicode-range, not font-display
        return browser.version[0] >= 17
    if browser.family in ("Firefox", "Firefox Mobile"):
        return browser.version[0] >= 58
    if browser.family in ("Chrome", "Chrome Mobile"):
        return browser.version[0] >= 60
    if browser.family == "Safari":
        return browser.version[0] >= 11 and browser.version[1] >= 1
    if browser.family == "Opera":
        return browser.version[0] >= 47
    if browser.family == "Mobile Safari":
        return browser.version[0] >= 11 and browser.version[1] >= 4

    return False


@register.simple_tag(takes_context=True)
def kolibri_language_globals(context):

    template = """
    <script>
      var languageCode = '{lang_code}';
      var languageDir = '{lang_dir}';
      var languages = JSON.parse('{languages}');
      var useModernFontLoading = {use_modern};
    </script>
    <link type="text/css" href="{common_css_file}?v={version}" rel="stylesheet"/>
    <link type="text/css" href="{subset_css_file}?v={version}" rel="stylesheet"/>
    <link type="text/css" href="{full_css_file}?v={version}" rel="stylesheet"/>
    """

    language_code = get_language()
    lang_dir = "rtl" if get_language_bidi() else "ltr"

    languages = {}
    for code, language_name in settings.LANGUAGES:
        lang_info = next((lang for lang in i18n.KOLIBRI_SUPPORTED_LANGUAGES if lang['intl_code'] == code), None)
        languages[code] = {
            # Format to match the schema of the content Language model
            "id": code,
            "lang_name": language_name,
            "english_name": lang_info["english_name"] if lang_info else get_language_info(code)["name"],
            "lang_direction": get_language_info(code)["bidi"],
        }

    common_file = static("assets/fonts/noto-common.css")
    subset_file = static("assets/fonts/noto-subset.{}.css".format(language_code))
    is_modern = _supports_modern_fonts(context["request"])
    full_file = static(
        "assets/fonts/noto-full.{}.{}.css".format(
            language_code, ("modern" if is_modern else "basic")
        )
    )

    return mark_safe(
        template.format(
            lang_code=language_code,
            lang_dir=lang_dir,
            languages=json.dumps(languages),
            use_modern="true" if is_modern else "false",
            common_css_file=common_file,
            subset_css_file=subset_file,
            full_css_file=full_file,
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


@register.simple_tag(takes_context=True)
def kolibri_set_urls(context):
    # Modified from:
    # https://github.com/ierror/django-js-reverse/blob/master/django_js_reverse/core.py#L101
    js_global_object_name = 'window'
    js_var_name = 'kolibriUrls'
    script_prefix = get_script_prefix()

    if 'request' in context:
        default_urlresolver = get_resolver(getattr(context['request'], 'urlconf', None))
    else:
        default_urlresolver = get_resolver(None)

    js = render_to_string('django_js_reverse/urls_js.tpl', {
        'urls': sorted(list(prepare_url_list(default_urlresolver))),
        'url_prefix': script_prefix,
        'js_var_name': js_var_name,
        'js_global_object_name': js_global_object_name,
    })

    js = jsmin(js)

    js = (
        """<script type="text/javascript">"""
        + js + """
        {global_object}.staticUrl = '{static_url}';
        </script>
        """.format(
            global_object=js_global_object_name,
            static_url=settings.STATIC_URL))
    return mark_safe(js)


@register.simple_tag(takes_context=True)
def kolibri_bootstrap_model(context, base_name, api_resource, **kwargs):
    response, kwargs = _kolibri_bootstrap_helper(context, base_name, api_resource, 'detail', **kwargs)
    html = ("<script type='text/javascript'>"
            "var model = {0}.resources.{1}.createModel(JSON.parse({2}));"
            "model.synced = true;"
            "</script>".format(
                conf.KOLIBRI_CORE_JS_NAME,
                api_resource,
                json.dumps(JSONRenderer().render(response.data).decode('utf-8'))))
    return mark_safe(html)


@register.simple_tag(takes_context=True)
def kolibri_bootstrap_collection(context, base_name, api_resource, **kwargs):
    response, kwargs = _kolibri_bootstrap_helper(context, base_name, api_resource, 'list', **kwargs)
    html = ("<script type='text/javascript'>"
            "var collection = {0}.resources.{1}.createCollection({2}, JSON.parse({3}));"
            "collection.synced = true;"
            "</script>".format(conf.KOLIBRI_CORE_JS_NAME,
                               api_resource,
                               json.dumps(kwargs),
                               json.dumps(JSONRenderer().render(response.data).decode('utf-8')),
                               ))
    return mark_safe(html)


def _replace_dict_values(check, replace, dict):
    for (key, value) in iteritems(dict):
        if dict[key] is check:
            dict[key] = replace


def _kolibri_bootstrap_helper(context, base_name, api_resource, route, **kwargs):
    reversal = dict()
    kwargs_check = 'kwargs_'
    # remove prepended string and matching items from kwargs
    for key in list(kwargs.keys()):
        if kwargs_check in key:
            item = kwargs.pop(key)
            key = re.sub(kwargs_check, '', key)
            reversal[key] = item
    view, view_args, view_kwargs = resolve(reverse('kolibri:core:{0}-{1}'.format(base_name, route), kwargs=reversal))
    # switch out None temporarily because invalid filtering and caching can occur
    _replace_dict_values(None, str(''), kwargs)
    request = copy.copy(context['request'])
    request.GET = request.GET.copy()
    for key in kwargs:
        request.GET[key] = kwargs[key]
    response = view(request, **view_kwargs)
    _replace_dict_values(str(''), None, kwargs)
    return response, kwargs


@register.simple_tag()
def kolibri_sentry_error_reporting():

    if not conf.OPTIONS['Debug']['SENTRY_FRONTEND_DSN']:
        return ''

    template = """
      <script>
        var sentryDSN = '{}';
      </script>
    """
    return mark_safe(
        template.format(
            conf.OPTIONS['Debug']['SENTRY_FRONTEND_DSN'],
        )
    )
